import { type BotContext, type CommandContext } from "../types.js";
import { type WizardStep, type OrderType, type OrderDraft } from "./types.js";
import { type Language, dictionaries } from "../locales/index.js";
import { getUser } from "../db/users.js";
import { createOrder, getOrdersCreatedBy } from "../db/orders.js";
import { buildMarginKeyboard } from "../shared/keyboards.js";
import {
  getMinFiatAmount,
  getMaxLightningFiatAmount,
  getMinSats,
  getRateInfoFor,
  LIGHTNING_MAX_SATS,
  ratesCache,
} from "../utils/price.js";
import { generateOrderId } from "../utils/crypto.js";
import { safeDeleteMsg, safeRemoveMarkup } from "../utils/telegram.js";
import { resetSession } from "../utils/session.js";
import { publishOrderToChannel as publishOrderToChannelService } from "../services/orderPublisher.js";
import { formatFiatAmount } from "../utils/format.js";
import { Markup } from "telegraf";
import { SettlementMethodType, getSettlementMethodLabel } from "../shared/constants.js";

function getPromptForStep(step: WizardStep, lang: Language): string {
  const dict = dictionaries[lang];
  switch (step) {
    case "SELECT_SETTLEMENT_METHOD":
      return dict.promptSelectSettlementMethod;
    case "WAITING_FIAT":
      return dict.promptFiat;
    case "WAITING_AMOUNT":
      return dict.promptAmount;
    case "WAITING_MARGIN":
      return dict.promptMargin;
    case "WAITING_PAYMENT_METHOD":
      return dict.promptPaymentMethod;
    default:
      return "";
  }
}

function getWizardPreviewText(
  draft: OrderDraft,
  step: WizardStep,
  lang: Language,
  customPrompt?: string,
): string {
  const dict = dictionaries[lang];

  const typeText = draft.type === "BUY" ? dict.buyType : dict.sellType;
  const chainText = getSettlementMethodLabel(draft.settlementMethod);
  const fiatText = draft.fiat || "";
  const amountText = draft.amount || "";

  let marginText = "";
  if (draft.margin !== undefined) {
    marginText = draft.margin > 0 ? `+${draft.margin}%` : `${draft.margin}%`;
  }

  const methodText = draft.paymentMethod || "";
  const promptText = customPrompt ?? getPromptForStep(step, lang);

  return dict.wizardPreview(
    chainText,
    typeText,
    fiatText,
    formatFiatAmount(amountText),
    marginText,
    methodText,
    promptText,
  );
}

export async function startOrderWizard(ctx: CommandContext, type: OrderType) {
  const userId = ctx.from.id;
  if (!userId) return;
  if (!ctx.user.encryptedMnemonic)
    return ctx.reply(ctx.dict.setYourPersonalPassword);
  let orderList = await getOrdersCreatedBy(userId);
  if (orderList.length >= 6) return await ctx.reply(ctx.dict.maxOrdersReached);

  const lang = ctx.user.language as Language;

  ctx.session = {
    step: "SELECT_SETTLEMENT_METHOD",
    draft: { type },
  };

  const text = getWizardPreviewText(ctx.session.draft, ctx.session.step, lang);
  const sentMessage = await ctx.reply(text, {
    ...Markup.inlineKeyboard([
      Markup.button.callback("⛓️ On-chain", "network_bitcoin"),
      Markup.button.callback("⚡ Lightning", "network_lightning"),
    ]),
    parse_mode: "Markdown",
  });
  ctx.session.previewMessageId = sentMessage.message_id;
}

export async function cancelWizard(ctx: BotContext) {
  const userId = ctx.from?.id;
  if (!userId) return;

  resetSession(ctx);
  await ctx.reply(ctx.dict.cancelled);
}

export async function handleWizardInput(ctx: BotContext): Promise<boolean> {
  const step = ctx.session.step;
  if (!step || step === "IDLE") return false;

  const userId = ctx.from?.id;
  if (!userId) return false;
  const lang = ctx.user.language as Language;

  const message = ctx.message;
  const text = message && "text" in message ? message.text.trim() : "";

  await safeDeleteMsg(ctx);

  const chatId = ctx.chat?.id;
  const previewId = ctx.session.previewMessageId;

  async function updatePreview(
    newStep: WizardStep,
    markup?: any,
    errorMessage?: string,
  ) {
    if (chatId && previewId) {
      try {
        let d = { parse_mode: "Markdown" } as any;
        if (markup) d = { ...d, ...markup };
        await ctx.telegram.editMessageText(
          chatId,
          previewId,
          undefined,
          getWizardPreviewText(ctx.session.draft, newStep, lang, errorMessage),
          d,
        );
      } catch (e) {}
    }
  }

  switch (step) {
    case "WAITING_FIAT":
      const CRYPTO_TICKERS = new Set([
        "BTC",
        "ETH",
        "LTC",
        "XMR",
        "SOL",
        "DOGE",
        "BNB",
        "TRX",
        "XRP",
        "ADA",
      ]);
      const f = text.trim().toUpperCase();

      if (!/^[A-Z]{3}$/.test(f) || CRYPTO_TICKERS.has(f)) {
        await updatePreview("WAITING_FIAT", null, ctx.dict.invalidFiatCode);
        return true;
      }

      try {
        if (!ratesCache.has(f)) {
          const res = await fetch(`https://api.yadio.io/rate/${f}/BTC`, {
            signal: AbortSignal.timeout(10_000),
          });
          const data = res.ok ? await res.json() : null;
          if (!data?.rate) {
            await updatePreview("WAITING_FIAT", null, ctx.dict.invalidFiatCode);
            return true;
          }
          ratesCache.set(f, { rate: data.rate, timestamp: Date.now() });
        }
      } catch (error) {
        await updatePreview("WAITING_FIAT", null, ctx.dict.couldNotApplyMargin);
        return true;
      }

      ctx.session.draft.fiat = f.toUpperCase();
      ctx.session.step = "WAITING_AMOUNT";
      await updatePreview("WAITING_AMOUNT");
      return true;

    case "WAITING_AMOUNT":
      if (!text || !/^(\d+([.,]\d{1,2})?)(-(\d+([.,]\d{1,2})?))?$/.test(text)) {
        await updatePreview("WAITING_AMOUNT", undefined, ctx.dict.promptAmount);
        return true;
      }

      const parts = text.split("-");
      const amounts = parts.map((p) => {
        const num = Number(p.replace(",", "."));
        return num;
      });

      let isFiatBig = amounts.some(
        (amount) => !isFinite(amount) || amount > Number.MAX_SAFE_INTEGER,
      );
      if (isFiatBig) {
        await updatePreview(
          "WAITING_AMOUNT",
          undefined,
          ctx.dict.fiatValueTooBig,
        );
        return true;
      }

      const [min, max] = amounts as [number, number?];
      if (max !== undefined && min > max) {
        await updatePreview(
          "WAITING_AMOUNT",
          undefined,
          ctx.dict.invalidAmountRangeOrder,
        );
        return true;
      }

      // Un rango con el mismo mínimo y máximo equivale a un monto exacto.
      const normalizedAmount =
        max !== undefined && min === max ? String(min) : text.replaceAll(",", ".");

      let appliedRate: number;
      try {
        const rateInfo = await getRateInfoFor(min, ctx.session.draft.fiat!, 0);
        appliedRate = rateInfo.appliedRate;
      } catch (e) {
        await updatePreview(
          "WAITING_AMOUNT",
          undefined,
          ctx.dict.couldNotFetchPrice,
        );
        return true;
      }

      const minFiatValue = getMinFiatAmount(
        appliedRate,
        ctx.session.draft.settlementMethod,
      );
      if (min < minFiatValue) {
        await updatePreview(
          "WAITING_AMOUNT",
          undefined,
          ctx.dict.fiatValueBelowMinimun(ctx.session.draft.fiat!, minFiatValue),
        );
        return true;
      }

      if (
        ctx.session.draft.settlementMethod ===
          SettlementMethodType.Lightning &&
        Number.isFinite(LIGHTNING_MAX_SATS)
      ) {
        const maxAmount = max ?? min;
        const maxSatsAmount = Math.floor(
          (maxAmount / appliedRate) * 100_000_000,
        );
        if (maxSatsAmount > LIGHTNING_MAX_SATS) {
          await updatePreview(
            "WAITING_AMOUNT",
            undefined,
            ctx.dict.lightningAmountAboveMaximum(
              ctx.session.draft.fiat!,
              getMaxLightningFiatAmount(appliedRate),
              LIGHTNING_MAX_SATS,
            ),
          );
          return true;
        }
      }

      ctx.session.draft.amount = normalizedAmount;
      ctx.session.step = "WAITING_MARGIN";

      await updatePreview(
        "WAITING_MARGIN",
        buildMarginKeyboard(ctx.dict.marketPrice),
      );
      return true;

    case "WAITING_PAYMENT_METHOD":
      if (!text || text.trim().length === 0) return true;

      ctx.session.draft.paymentMethod = text.trim();
      await publishOrderToChannel(ctx, lang);
      resetSession(ctx);
      return true;

    default:
      return false;
  }
}

export async function handleWizardAction(ctx: BotContext) {
  const callbackQuery = ctx.callbackQuery as { data?: string };
  const userId = ctx.from?.id;
  if (!userId) return;
  const lang = ctx.user.language as Language;
  const updatePreview = async () => {
    const chatId = ctx.chat?.id;
    const previewId = ctx.session.previewMessageId;

    if (chatId && previewId) {
      try {
        const currentText = getWizardPreviewText(
          ctx.session.draft,
          ctx.session.step,
          lang,
        );

        await ctx.telegram.editMessageText(
          chatId,
          previewId,
          undefined,
          currentText,
          {
            parse_mode: "Markdown",
          },
        );
      } catch (e) {}
    }
  }
  if (callbackQuery?.data?.startsWith("network_")) {
    if (ctx.session.step !== "SELECT_SETTLEMENT_METHOD") return;
    await ctx.answerCbQuery();
    await safeRemoveMarkup(ctx);
    const chain = callbackQuery.data.split("_")[1] as "bitcoin" | "lightning";
    ctx.session.draft.settlementMethod =
      chain === "bitcoin"
        ? SettlementMethodType.OnChain
        : SettlementMethodType.Lightning;
    ctx.session.step = "WAITING_FIAT"
    await updatePreview();
    return;
  }

  if (!callbackQuery?.data?.startsWith("margin_")) return;

  const margin = parseInt(callbackQuery.data.replace("margin_", ""), 10);

  const { amount, fiat } = ctx.session.draft;

  await ctx.answerCbQuery();

  try {
    const [minAmount, maxAmount] = amount!.split("-");
    const min = parseFloat(minAmount!);
    const max = maxAmount ? parseFloat(maxAmount) : min;
    const { satsAmount, appliedRate } = await getRateInfoFor(
      min,
      fiat!,
      margin,
    );

    const minSats = getMinSats(ctx.session.draft.settlementMethod);
    if (satsAmount < minSats) {
      const minFiatRequired = (minSats / 100_000_000) * appliedRate;
      await safeRemoveMarkup(ctx);
      await ctx.reply(
        ctx.dict.invalidAmountAfterMargin({
          margin,
          minFiatRequired: formatFiatAmount(minFiatRequired),
          satsAmount,
          minSats,
          fiatCode: fiat!,
        }),
        { parse_mode: "Markdown" },
      );

      ctx.session.step = "IDLE";
      ctx.session.draft = {};
      return;
    }

    if (
      ctx.session.draft.settlementMethod === SettlementMethodType.Lightning &&
      Number.isFinite(LIGHTNING_MAX_SATS)
    ) {
      const maxSatsAmount = Math.floor((max / appliedRate) * 100_000_000);
      if (maxSatsAmount > LIGHTNING_MAX_SATS) {
        const maxFiatRequired = getMaxLightningFiatAmount(appliedRate);
        await safeRemoveMarkup(ctx);
        await ctx.reply(
          ctx.dict.lightningAmountAboveMaximumAfterMargin({
            margin,
            maxFiatRequired: formatFiatAmount(maxFiatRequired),
            maxSats: LIGHTNING_MAX_SATS,
            fiatCode: fiat!,
          }),
          { parse_mode: "Markdown" },
        );

        ctx.session.step = "IDLE";
        ctx.session.draft = {};
        return;
      }
    }

    ctx.session.draft.margin = margin;
    ctx.session.step = "WAITING_PAYMENT_METHOD";

    await updatePreview();
  } catch (error) {
    console.error("Error validando el margen:", error);
    await ctx.reply(ctx.dict.couldNotApplyMargin);
  }
}

async function publishOrderToChannel(ctx: BotContext, lang: Language) {
  const dict = dictionaries[lang];
  const { margin, type, fiat, amount, paymentMethod, settlementMethod } = ctx.session.draft;
  const userId = ctx.from?.id;

  if (!userId) return;

  const user = await getUser(userId);
  const orderId = generateOrderId();

  await createOrder({
    id: orderId,
    type: type!,
    settlementMethod,
    creatorId: userId,
    amountFiat: amount!,
    fiatCode: fiat!,
    paymentMethod: paymentMethod!,
    margin: margin!,
  });

  await publishOrderToChannelService(
    ctx.telegram,
    {
      id: orderId,
      type: type!,
      settlementMethod: settlementMethod ?? SettlementMethodType.OnChain,
      fiatCode: fiat!,
      amountFiat: amount!,
      paymentMethod: paymentMethod!,
      margin: margin!,
    },
    user!,
  );

  const chatId = ctx.chat?.id;
  const previewId = ctx.session.previewMessageId;
  if (chatId && previewId) {
    try {
      await ctx.telegram.editMessageText(
        chatId,
        previewId,
        undefined,
        getWizardPreviewText(
          ctx.session.draft,
          "IDLE",
          ctx.user.language as any,
          ctx.dict.wizardFinishedPrompt,
        ),
        { parse_mode: "Markdown" },
      );
      await ctx.reply(dict.orderPublishedSuccess(orderId), {
        parse_mode: "Markdown",
      });
    } catch (e) {}
  }
}
