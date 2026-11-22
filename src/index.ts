import "dotenv/config";
import { Markup, Telegraf, session } from "telegraf";
import { type BotContext, type SessionData } from "./types.js";
import {
  startOrderWizard,
  cancelWizard,
  handleWizardInput,
  handleWizardAction,
} from "./wizards/orderWizard.js";
import { getUserDict } from "./locales/index.js";
import { getUser } from "./db/users.js";
import {
  handleMakerConfirm,
  handleOrderCancelledRepublish,
  handleTakeOrder,
  handleTakerConfirm,
  notifyMakerForConfirmation,
  proceedAfterTakerAmount,
} from "./handlers/orderHandler.js";
import { getOrder, tryTransitionOrderStatus } from "./db/orders.js";
import { message } from "telegraf/filters";
import { orders, users } from "./db/schema.js";
import { db } from "./db/index.js";
import { and, eq, inArray, or } from "drizzle-orm";
import {
  buildRefundPsbt,
  buildReleasePsbt,
  findSpendingTxid,
  getLiveMinerFee,
  isValidAddress,
} from "./core/bitcoin/index.js";
import { initializeEscrow } from "./handlers/escrowHandler.js";
import {
  startEscrowMonitor,
  startOrderTimeoutsMonitor,
} from "./services/monitor.js";
import { userMiddleware } from "./middlewares/auth.js";
import {
  claimCommand,
  fiatsentCommand,
  releaseCommand,
  cancelCommand,
  listOrdersCommand,
  disputeCommand,
  takeDisputeCommand,
  settleCommand,
  helpCommand,
  setlangCommand,
  feesCommand,
  setFeeCommand,
} from "./commands/index.js";
import {
  claimPasswordStep,
  setPassStep,
  claimRefundAddressStep,
} from "./steps/index.js";
import { resolveDispute } from "./handlers/disputeHandler.js";
import { handleOrderCancelFromCommand } from "./commands/cancel.js";
import { handleRating } from "./handlers/ratingHandler.js";
import { OrderStatus, Strings } from "./shared/constants.js";
import { handleSetLangAction } from "./commands/setlang.js";
import { markAsFiatSent } from "./commands/fiatsent.js";
import { askReleaseConfirmation, doFundsRelease } from "./commands/release.js";
import { initiateClaim } from "./commands/claim.js";
import { safeRemoveMarkup } from "./utils/telegram.js";
import { backupCommand, handleOrderBackup } from "./commands/backup.js";

const bot = new Telegraf<BotContext>(process.env.BOT_TOKEN!);

bot.use(
  session({ defaultSession: (): SessionData => ({ step: "IDLE", draft: {} }) }),
);
bot.use(userMiddleware);
bot.use((ctx, next) => {
  if (
    ctx.message &&
    "text" in ctx.message &&
    ctx.message.text.startsWith("/")
  ) {
    ctx.session = { step: "IDLE", draft: {} };
  }
  return next();
});
bot.command("buy", (ctx) => startOrderWizard(ctx, "BUY"));
bot.command("sell", (ctx) => startOrderWizard(ctx, "SELL"));
bot.command("exit", (ctx) => cancelWizard(ctx));
bot.command("setpass", async (ctx) => {
  if (ctx.user.xpub !== null) return ctx.reply(ctx.dict.passwordAlreadySet);
  ctx.session.step = "SET_PASS";
  await ctx.reply(ctx.dict.promptPassword, { parse_mode: "Markdown" });
});

bot.command("claim", claimCommand);
bot.command("fiatsent", fiatsentCommand);
bot.command("release", releaseCommand);
bot.command("cancel", cancelCommand);
bot.command("listorders", listOrdersCommand);
bot.command("dispute", disputeCommand);
bot.command("takedispute", takeDisputeCommand);
bot.command("settle", settleCommand);
bot.command("help", helpCommand);
bot.command("setlang", setlangCommand);
bot.command("fees", feesCommand);
bot.command("setfee", setFeeCommand);
bot.command("backup", backupCommand);

bot.action(/^claim_pass_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const orderId = ctx.match[1];
  const order = await getOrder(orderId!);
  await safeRemoveMarkup(ctx);
  if (!order) return await ctx.reply(ctx.dict.orderNotFound);

  ctx.session.step = "CLAIM_PASSWORD";
  ctx.session.claimOrderId = orderId;

  await ctx.reply(ctx.dict.typePassword);
});

const generatingExternalPsbt = new Set<string>();

bot.action(/^claim_ext_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const orderId = ctx.match[1];
  if (!orderId || generatingExternalPsbt.has(orderId)) return;

  const order = await getOrder(orderId);
  if (!order) return await ctx.reply(ctx.dict.orderNotFound);

  const userId = ctx.from.id;
  const buyerId = order.type === "BUY" ? order.creatorId : order.takerId;
  const sellerId = order.type === "SELL" ? order.creatorId : order.takerId;

  const isBuyerClaim =
    buyerId === userId && order.status === OrderStatus.Releasable;
  const isSellerRefund =
    sellerId === userId && order.status === OrderStatus.Refundable;

  if (!isBuyerClaim && !isSellerRefund) {
    return await ctx.reply(ctx.dict.invalidOrderStatus);
  }

  generatingExternalPsbt.add(orderId);
  try {
    if (order.escrowAddress) {
      const spentTxid = await findSpendingTxid(order.escrowAddress);
      if (spentTxid) {
        await tryTransitionOrderStatus(
          order.id,
          [OrderStatus.Releasable, OrderStatus.Refundable],
          isSellerRefund
            ? OrderStatus.ExternallyRefunded
            : OrderStatus.ExternallyCompleted,
          { payoutTxid: spentTxid },
        );
        return await ctx.reply(
          ctx.dict.orderExternallySigned(order.id, spentTxid),
          { parse_mode: "Markdown" },
        );
      }
    }

    if (isSellerRefund && !order.refundAddress) {
      ctx.session.step = "CLAIM_REFUND_ADDRESS";
      ctx.session.claimOrderId = order.id;
      return await ctx.reply(ctx.dict.askRefundAddress, {
        parse_mode: "Markdown",
      });
    }

    await ctx.editMessageReplyMarkup(undefined).catch(() => {});

    let psbtBuffer: Buffer;

    if (order.externalPsbt) {
      psbtBuffer = Buffer.from(order.externalPsbt, "base64");
    } else {
      const user = await getUser(userId);
      const { feeRate } = await getLiveMinerFee({
        escrowAddress: order.escrowAddress,
        customFeeRate: user?.customFee || null,
      });

      const { psbt, escrowBotKeypair } = isBuyerClaim
        ? await buildReleasePsbt(order, feeRate)
        : await buildRefundPsbt(order, feeRate);

      psbt.signAllInputs(escrowBotKeypair);
      psbtBuffer = Buffer.from(psbt.toBuffer());

      await db
        .update(orders)
        .set({ externalPsbt: psbtBuffer.toString("base64") })
        .where(eq(orders.id, order.id));
    }

    const claimType = isBuyerClaim ? "claim" : "refund";

    await ctx.replyWithDocument(
      {
        source: psbtBuffer,
        filename: `abitp2p-${claimType}-${order.id}.psbt`,
      },
      {
        caption: ctx.dict.externalSignInstructions,
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback(
              ctx.dict.btnConfirmExternalBroadcast,
              `confirm_broadcast_${order.id}`,
            ),
          ],
        ]),
      },
    );
  } catch (err) {
    console.error("Error generando PSBT externo:", err);
    await ctx.reply(
      ctx.dict.errorProcessingTx(
        err instanceof Error ? err.message : String(err),
      ),
      { parse_mode: "Markdown" },
    );
  } finally {
    generatingExternalPsbt.delete(orderId);
  }
});

bot.action(/^confirm_broadcast_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const orderId = ctx.match[1];
  if (!orderId) return;

  const order = await getOrder(orderId);
  if (!order) return await ctx.reply(ctx.dict.orderNotFound);

  const userId = ctx.from.id;
  const buyerId = order.type === "BUY" ? order.creatorId : order.takerId;
  const sellerId = order.type === "SELL" ? order.creatorId : order.takerId;

  if (userId !== buyerId && userId !== sellerId) {
    return await ctx.reply(ctx.dict.unauthorizedAccess);
  }

  if (
    order.status === OrderStatus.Completed ||
    order.status === OrderStatus.Refunded
  ) {
    await safeRemoveMarkup(ctx);
    return await ctx.reply(
      ctx.dict.orderExternallySigned(order.id, order.payoutTxid),
      { parse_mode: "Markdown" },
    );
  }

  if (
    order.status !== OrderStatus.Releasable &&
    order.status !== OrderStatus.Refundable
  ) {
    return await ctx.reply(ctx.dict.invalidOrderStatus);
  }

  if (!order.escrowAddress) {
    return await ctx.reply(ctx.dict.invalidOrderStatus);
  }

  const spentTxid = await findSpendingTxid(order.escrowAddress);
  if (!spentTxid) {
    return await ctx.reply(ctx.dict.externalBroadcastNotDetected, {
      parse_mode: "Markdown",
    });
  }

  const isRefund = order.status === OrderStatus.Refundable;
  const targetStatus = isRefund
    ? OrderStatus.ExternallyRefunded
    : OrderStatus.ExternallyCompleted;

  const didTransition = await tryTransitionOrderStatus(
    order.id,
    [OrderStatus.Releasable, OrderStatus.Refundable],
    targetStatus,
    {
      payoutTxid: spentTxid,
    },
  );

  if (didTransition) {
    await safeRemoveMarkup(ctx);

    if (isRefund && buyerId) {
      const buyer = await getUser(buyerId);
      const buyerDict = getUserDict(buyer?.language);
      await ctx.telegram.sendMessage(
        buyerId,
        buyerDict.refundCompletedNotification(order.id),
        { parse_mode: "Markdown" },
      );
    }
  }

  return await ctx.reply(ctx.dict.orderExternallySigned(order.id, spentTxid), {
    parse_mode: "Markdown",
  });
});

bot.on("callback_query", async (ctx, next) => {
  const query = ctx.callbackQuery as { data?: string };
  const data = query?.data;

  if (!data) return next();

  if (data.startsWith("margin_")) {
    if (!ctx.session.draft.amount) return; // Es posible que haya presionado el botón de un mensaje pasado.
    return handleWizardAction(ctx);
  }

  if (data.startsWith("take_order_")) {
    const orderId = data.replace("take_order_", "");
    return handleTakeOrder(ctx, orderId);
  }

  if (data.startsWith("taker_yes_")) {
    return handleTakerConfirm(ctx, data.replace("taker_yes_", ""));
  }

  if (data.startsWith("maker_yes_")) {
    return handleMakerConfirm(ctx, data.replace("maker_yes_", ""));
  }
  if (data.startsWith("taker_cancel_order_")) {
    const orderId = data.replace("taker_cancel_order_", "");
    return handleOrderCancelledRepublish(ctx, orderId);
  }

  if (data.startsWith("setlang_")) {
    return handleSetLangAction(ctx);
  }

  if (data.startsWith("cancelCommand_")) {
    const orderId = data.replace("cancelCommand_", "");
    await safeRemoveMarkup(ctx);
    return handleOrderCancelFromCommand(ctx, orderId);
  }

  if (data.startsWith("backupCommand")) {
    const orderId = data.replace("backupCommand_", "");
    await safeRemoveMarkup(ctx);
    return handleOrderBackup(ctx, orderId);
  }

  if (data.startsWith("fiatsentCommand_")) {
    const orderId = data.replace("fiatsentCommand_", "");
    await markAsFiatSent(ctx, orderId);
  }

  if (data.startsWith("releaseCommand_")) {
    const orderId = data.replace("releaseCommand_", "");
    await askReleaseConfirmation(ctx, orderId);
  }

  if (data.startsWith("confirmRelease")) {
    const orderId = data.replace("confirmRelease_", "");
    const order = await getOrder(orderId);
    if (!order)
      return ctx.answerCbQuery(ctx.dict.orderNotFound, { show_alert: true });
    await doFundsRelease(ctx, order);
  }

  if (data.startsWith("cancelRelease")) {
    return await ctx.editMessageText(ctx.dict.cancelled);
  }

  if (data.startsWith("claimCommand_")) {
    const orderId = data.replace("claimCommand_", "");
    return initiateClaim(ctx, orderId);
  }

  if (data.startsWith("setfee_default")) {
    await db
      .update(users)
      .set({ customFee: null })
      .where(eq(users.telegramId, ctx.from.id));
    await db
      .update(orders)
      .set({ externalPsbt: null })
      .where(
        and(
          inArray(orders.status, [
            OrderStatus.Releasable,
            OrderStatus.Refundable,
          ]),
          or(
            eq(orders.creatorId, ctx.from.id),
            eq(orders.takerId, ctx.from.id),
          ),
        ),
      );
    await ctx.answerCbQuery();
    await ctx.editMessageText(ctx.dict.feeResetSuccess, {
      parse_mode: "Markdown",
    });
  }

  if (data.startsWith("maker_deny_")) {
    const orderId = data.replace("maker_deny_", "");
    const order = await getOrder(orderId);
    if (!order) return;

    const didCancel = await tryTransitionOrderStatus(
      orderId,
      [OrderStatus.WaitingMakerConfirmation],
      OrderStatus.Cancelled,
    );
    if (!didCancel) {
      await safeRemoveMarkup(ctx);
      return ctx.answerCbQuery(ctx.dict.cancelNotAllowed, { show_alert: true });
    }

    await ctx.editMessageText(ctx.dict.orderCancelled);

    if (order.takerId) {
      const taker = await getUser(order.takerId);
      const takerDict = getUserDict(taker?.language);
      await ctx.telegram.sendMessage(
        order.takerId,
        takerDict.counterpartyCanceledDeleted(orderId),
        { parse_mode: "Markdown" },
      );
    }
    return;
  }

  if (data.startsWith("rate_")) {
    // "rate_5_orderId"
    const parts = data.split("_");
    if (parts.length < 3) return;
    const stars = parseInt(parts[1]!);
    const orderId = parts[2]!;
    const raterId = ctx.from.id;

    return await handleRating(ctx, {
      orderId,
      stars,
      raterId,
    });
  }

  if (data.startsWith("settle_buyer_")) {
    return resolveDispute(ctx, data.replace("settle_buyer_", ""), "BUYER");
  }
  if (data.startsWith("settle_seller_")) {
    return resolveDispute(ctx, data.replace("settle_seller_", ""), "SELLER");
  }
  if (data.startsWith("settle_refund_")) {
    return resolveDispute(ctx, data.replace("settle_refund_", ""), "REFUND");
  }

  return next();
});

bot.start(async (ctx) => {
  const text =
    `🤖 *¡Bienvenido a aBitP2P! / Welcome to aBitP2P!*\n\n` +
    `🇪🇸 *ESPAÑOL*\n` +
    `⚠️ *Paso 1:* Usa /setpass para configurar tu contraseña y activar tu cuenta.\n` +
    `🌍 *Idioma:* Usa /setlang para cambiar a inglés (u otro idioma).\n` +
    `📚 *Ayuda:* Usa /help para ver los comandos.\n` +
    `📢 *Comunidad:* Chat general ${Strings.GeneralChatTag} | Órdenes ${Strings.OrderChannelTag}\n` +
    `⚡️ *Nota:* Estamos en fase inicial. ¡Publica tus ofertas y ayúdanos a crear liquidez!\n\n` +
    `➖ ➖ ➖ ➖ ➖ ➖ ➖\n\n` +
    `🇬🇧 *ENGLISH*\n` +
    `⚠️ *Step 1:* Use /setpass to set your password and activate your account.\n` +
    `🌍 *Language:* Use /setlang to change the bot's language.\n` +
    `📚 *Help:* Use /help to see all commands.\n` +
    `📢 *Community:* General chat ${Strings.GeneralChatTag} | Orders ${Strings.OrderChannelTag}\n` +
    `⚡️ *Note:* We are in early stages. Place your offers to help us build liquidity!`;

  await ctx.reply(text, { parse_mode: "Markdown" });
});

bot.on(message("text"), async (ctx, next) => {
  const text = ctx.message.text;
  if (ctx.session.step === "SET_PASS") {
    await setPassStep(ctx);
    return;
  }

  if (ctx.session.step === "CLAIM_PASSWORD") {
    await claimPasswordStep(ctx);
    return;
  }

  if (ctx.session.step === "CLAIM_REFUND_ADDRESS") {
    await claimRefundAddressStep(ctx);
    return;
  }

  if (ctx.session.step !== "IDLE") {
    return handleWizardInput(ctx);
  }

  const orderToSetAmount = ctx.session.awaitingAmountForOrder;
  if (orderToSetAmount) {
    const order = await getOrder(orderToSetAmount);
    if (
      !order ||
      order.status !== OrderStatus.WaitingTakerConfirmation ||
      order.takerId !== ctx.from.id
    ) {
      ctx.session.awaitingAmountForOrder = undefined;
      return next();
    }

    const [minStr, maxStr] = order.amountFiat.split("-");
    const min = parseFloat(minStr!);
    const max = parseFloat(maxStr!);
    const normalizedText = text.trim().replaceAll(",", ".");
    const inputAmount = Number(normalizedText);

    const dict = ctx.dict;

    if (
      !/^\d+(\.\d{1,2})?$/.test(normalizedText) ||
      isNaN(inputAmount) ||
      inputAmount < min ||
      inputAmount > max
    ) {
      return ctx.reply(dict.invalidAmountRange(min, max), {
        parse_mode: "Markdown",
      });
    }

    await db
      .update(orders)
      .set({ fiatAmountLocked: inputAmount })
      .where(eq(orders.id, order.id));
    ctx.session.awaitingAmountForOrder = undefined;

    return proceedAfterTakerAmount(ctx, {
      ...order,
      fiatAmountLocked: inputAmount, // Para evitar volver a hacer un fetch después
    });
  }

  const orderId = ctx.session.awaitingAddressForOrder;

  if (orderId) {
    const address = ctx.message.text.trim();
    const order = await getOrder(orderId);

    if (
      !order ||
      (order.status !== OrderStatus.WaitingTakerConfirmation &&
        order.status !== OrderStatus.WaitingMakerConfirmation)
    ) {
      ctx.session.awaitingAddressForOrder = undefined;
      return next();
    }

    if (!isValidAddress(address)) {
      return ctx.reply(ctx.dict.invalidBuyerAddress, {
        parse_mode: "Markdown",
      });
    }

    await db
      .update(orders)
      .set({ buyerAddress: address })
      .where(eq(orders.id, orderId));
    ctx.session.awaitingAddressForOrder = undefined;

    const dict = ctx.dict;

    if (order.status === OrderStatus.WaitingTakerConfirmation) {
      await ctx.reply(dict.waitMaker, { parse_mode: "Markdown" });
      await notifyMakerForConfirmation(ctx, order);
    } else if (order.status === OrderStatus.WaitingMakerConfirmation) {
      const didTransition = await tryTransitionOrderStatus(
        orderId,
        [OrderStatus.WaitingMakerConfirmation],
        OrderStatus.WaitingEscrow,
      );

      if (didTransition) {
        await ctx.reply(dict.waitTaker, { parse_mode: "Markdown" });
        await initializeEscrow(ctx, orderId);
      }
    }
    return;
  }

  return next();
});

bot.catch((err, ctx) => {
  console.error(`Error en actualización ${ctx.update.update_id}:`, err);
});

startEscrowMonitor(bot);
startOrderTimeoutsMonitor(bot);
bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
