import { type BotContext, type CommandContext } from "../types.js";
import { type WizardStep, type LoanType } from "./types.js";
import { type Language, dictionaries } from "../locales/index.js";
import { createLoan, getLoansCreatedBy } from "../db/loans.js";
import { generateOrderId } from "../utils/crypto.js";
import { safeDeleteMsg } from "../utils/telegram.js";
import { LoanStatus } from "../shared/constants.js";
import { Markup } from "telegraf";
import { processLoanAPR, processLoanDuration } from "./loanSteps.js";
import { processFiatAmount, processFiatCode } from "./sharedSteps.js";

const CHANNEL_ID = process.env.PUBLIC_CHANNEL_ID!;

function getPromptForStep(step: WizardStep, lang: Language): string {
  const dict = dictionaries[lang];
  switch (step) {
    case "WAITING_LOAN_FIAT":
      return dict.promptFiat;
    case "WAITING_LOAN_AMOUNT":
      return dict.promptAmount;
    case "WAITING_LOAN_APR":
      return dict.promptLoanAPR;
    case "WAITING_LOAN_LTV":
      return dict.promptLoanLTV;
    case "WAITING_LOAN_DURATION":
      return dict.promptLoanDuration;
    case "WAITING_LOAN_PAYMENT_METHOD":
      return dict.promptLoanPaymentMethod;
    default:
      return "";
  }
}

function getWizardPreviewText(
  draft: any,
  step: WizardStep,
  lang: Language,
  customPrompt?: string,
): string {
  const dict = dictionaries[lang];

  const typeText = draft.type === "LEND" ? dict.lendType : dict.borrowType;
  const fiatText = draft.fiat || "--";
  const amountText = draft.amount || "--";
  const ltvText = draft.ltv ? `${draft.ltv}%` : "--";
  const aprText = draft.apr ? `${draft.apr}%` : "--";
  const durationText = draft.durationMonths ? `${draft.durationMonths}` : "--";
  const methodText = draft.paymentMethod || "--";

  const promptText = customPrompt ?? getPromptForStep(step, lang);

  return dict.loanWizardPreview(
    typeText,
    fiatText,
    amountText,
    aprText,
    ltvText,
    durationText,
    methodText,
    promptText,
  );
}

export async function startLoanWizard(ctx: CommandContext, type: LoanType) {
  const userId = ctx.from.id;
  if (!userId) return;
  if (!ctx.user.encryptedWif)
    return ctx.reply(ctx.dict.setYourPersonalPassword);

  let loansList = await getLoansCreatedBy(userId);
  if (loansList.length >= 6) return await ctx.reply(ctx.dict.maxLoansReached);

  const lang = ctx.user.language as Language;

  ctx.session = {
    step: "WAITING_LOAN_FIAT",
    draft: {},
    loanDraft: { type },
  };

  const text = getWizardPreviewText(
    ctx.session.loanDraft,
    ctx.session.step,
    lang,
  );
  const sentMessage = await ctx.reply(text, { parse_mode: "Markdown" });
  ctx.session.previewMessageId = sentMessage.message_id;
}

export async function handleLoanWizardInput(ctx: BotContext): Promise<boolean> {
  const step = ctx.session.step;
  if (!step || !step.startsWith("WAITING_LOAN_")) return false;

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
        await ctx.telegram.editMessageText(
          chatId,
          previewId,
          undefined,
          getWizardPreviewText(
            ctx.session.loanDraft,
            newStep,
            lang,
            errorMessage,
          ),
          { parse_mode: "Markdown", ...(markup || {}) },
        );
      } catch (e) {}
    }
  }

  switch (step) {
    case "WAITING_LOAN_FIAT": {
      const res = await processFiatCode(ctx.text!, ctx.dict);
      if (!res.success) {
        await updatePreview("WAITING_LOAN_FIAT", undefined, res.error);
        return true;
      }
      ctx.session.loanDraft!.fiat = res.fiatCode!;
      ctx.session.step = "WAITING_LOAN_AMOUNT";
      await updatePreview("WAITING_LOAN_AMOUNT");
      return true;
    }

    case "WAITING_LOAN_AMOUNT": {
      const { success, error, amount } = processFiatAmount(ctx.text!, ctx.dict);
      if (!success) {
        await updatePreview("WAITING_LOAN_AMOUNT", undefined, error);
        return true;
      }
      ctx.session.step = "WAITING_LOAN_APR";
      ctx.session.loanDraft!.amount = amount!;
      await updatePreview("WAITING_LOAN_APR");
      return true;
    }

    case "WAITING_LOAN_APR": {
      const { success, data, error } = processLoanAPR(ctx);
      if (!success) {
        await updatePreview("WAITING_LOAN_APR", undefined, error);
        return true
      }
      ctx.session.loanDraft!.apr = data!.apr;
      ctx.session.step = "WAITING_LOAN_LTV";
      await updatePreview("WAITING_LOAN_LTV", data!.keyboard);
      return true;
    }

    case "WAITING_LOAN_DURATION": {
      let { success, error, duration } = processLoanDuration(ctx);
      if (!success) {
        await updatePreview("WAITING_LOAN_DURATION", undefined, error);
        return true
      }
      ctx.session.loanDraft!.durationMonths = duration!;
      ctx.session.step = "WAITING_LOAN_PAYMENT_METHOD";
      await updatePreview("WAITING_LOAN_PAYMENT_METHOD");
      return true;
    }

    case "WAITING_LOAN_PAYMENT_METHOD": {
      if (text.length < 2) return true;
      ctx.session.loanDraft!.paymentMethod = text;

      await finalizeLoanCreation(ctx, lang);
      return true;
    }

    default:
      return false;
  }
}

export async function handleLoanWizardAction(ctx: BotContext) {
  const query = ctx.callbackQuery as { data?: string };
  if (
    !query?.data?.startsWith("ltv_") ||
    ctx.session.step !== "WAITING_LOAN_LTV"
  )
    return;

  const lang = ctx.user.language as Language;
  const ltv = parseInt(query.data.replace("ltv_", ""), 10);

  ctx.session.loanDraft!.ltv = ltv;
  ctx.session.step = "WAITING_LOAN_DURATION";

  await ctx.answerCbQuery();

  const chatId = ctx.chat?.id;
  const previewId = ctx.session.previewMessageId;

  if (chatId && previewId) {
    try {
      await ctx.telegram.editMessageText(
        chatId,
        previewId,
        undefined,
        getWizardPreviewText(ctx.session.loanDraft, ctx.session.step, lang),
        { parse_mode: "Markdown" },
      );
    } catch (e) {}
  }
}

async function finalizeLoanCreation(ctx: BotContext, lang: Language) {
  const dict = dictionaries[lang];
  const draft = ctx.session.loanDraft!;
  const user = ctx.user;

  if (!user) return;

  const loanId = generateOrderId();

  await createLoan({
    id: loanId,
    type: draft.type!,
    creatorId: user.telegramId,
    status: LoanStatus.Pending,
    amountFiat: draft.amount!,
    fiatCode: draft.fiat!,
    paymentMethod: draft.paymentMethod!,
    ltv: draft.ltv!,
    apr: draft.apr!,
    durationMonths: draft.durationMonths!,
  });

  ctx.session.step = "IDLE";
  //@ts-ignore
  ctx.session.loanDraft = undefined;

  const actionText =
    draft.type === "LEND" ? dict.actionLend : dict.actionBorrow;
  const buttonText =
    draft.type === "LEND" ? dict.btnTakeLoanBorrow : dict.btnTakeLoanLend;

  const publicMessage = dict.channelLoanOffer({
    action: actionText,
    draft: draft,
    user: user,
    loanId: loanId,
  });

  const takeButton = Markup.inlineKeyboard([
    Markup.button.callback(buttonText + " " + draft.fiat, `take_loan_${loanId}`),
  ]);

  await ctx.telegram.sendMessage(CHANNEL_ID, publicMessage, {
    parse_mode: "Markdown",
    ...takeButton,
  });

  const chatId = ctx.chat?.id;
  const previewId = ctx.session.previewMessageId;
  if (chatId && previewId) {
    try {
      await ctx.telegram.editMessageText(
        chatId,
        previewId,
        undefined,
        dict.loanPublishedSuccess(loanId),
        { parse_mode: "Markdown" },
      );
    } catch (e) {}
  }
}
