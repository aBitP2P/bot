import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { loans } from "../db/schema.js";
import {
  type BotContext,
  type CallbackContext,
  type CommandContext,
  type LoanRecord,
} from "../types.js";
import { getUser } from "../db/users.js";
import { getUserDict } from "../locales/index.js";
import { Markup } from "telegraf";
import { getLoan, getUserLoans, tryTransitionLoanStatus } from "../db/loans.js";
import { LoanStatus } from "../shared/constants.js";
import { escapeMarkdown } from "../utils/format.js";
import {
  buildMakerConfirmKeyboard,
  buildTakerConfirmKeyboard,
} from "../shared/keyboards.js";
import { getRateInfoFor } from "../utils/price.js";
import { safeDeleteMsg, safeRemoveMarkup } from "../utils/telegram.js";
import { initializeLoanEscrow } from "./escrowHandler.js";
import type { LoanType } from "../wizards/types.js";
import { getAccruedInterest, getContract, tryTransitionContract } from "../db/contracts.js";

const PUBLIC_CHANNEL_ID = process.env.PUBLIC_CHANNEL_ID!;

export async function republishLoanSilently(
  bot: CallbackContext | CommandContext,
  loanId: string,
) {
  const didReset = await tryTransitionLoanStatus(
    loanId,
    [LoanStatus.WaitingTakerConfirmation],
    LoanStatus.Pending,
    {
      takerId: null,
      borrowerAddress: null,
      lenderAddress: null,
      fiatAmountLocked: null,
      durationMonthsLocked: null,
      cancelRequestedBy: null,
      createdAt: Date.now(),
    },
  );

  if (!didReset) return false;

  const loan = await getLoan(loanId);
  if (!loan) return false;

  const loanCreator = await getUser(loan.creatorId);
  if (!loanCreator) return false;

  const dict = getUserDict(loanCreator.language);

  const draftAdapter = {
    amount: loan.amountFiat,
    fiat: loan.fiatCode,
    apr: loan.apr,
    ltv: loan.ltv,
    durationMonths: loan.durationMonths,
    paymentMethod: loan.paymentMethod,
  };

  const actionText = loan.type === "LEND" ? dict.actionLend : dict.actionBorrow;
  const buttonText =
    loan.type === "LEND" ? dict.btnTakeLoanBorrow : dict.btnTakeLoanLend;

  const sentChannelMsg = await bot.telegram.sendMessage(
    PUBLIC_CHANNEL_ID,
    dict.channelLoanOffer({
      action: actionText,
      draft: draftAdapter as any,
      user: loanCreator,
      loanId: loan.id,
    }),
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        Markup.button.callback(buttonText, `take_loan_${loan.id}`),
      ]),
    },
  );

  await db
    .update(loans)
    .set({ channelMessageId: sentChannelMsg.message_id })
    .where(eq(loans.id, loanId));

  return true;
}

export async function handleLoanCancelledRepublish(
  ctx: CallbackContext | CommandContext | BotContext,
  loanId: string,
  customMessage?: string,
) {
  const didReset = await tryTransitionLoanStatus(
    loanId,
    [LoanStatus.WaitingTakerConfirmation, LoanStatus.WaitingMakerConfirmation],
    LoanStatus.Pending,
    {
      takerId: null,
      borrowerAddress: null,
      lenderAddress: null,
      fiatAmountLocked: null,
      durationMonthsLocked: null,
      cancelRequestedBy: null,
      createdAt: Date.now(),
    },
  );

  if (!didReset) {
    if ("callbackQuery" in ctx && ctx.callbackQuery) {
      return ctx.answerCbQuery(ctx.dict.cancelNotAllowed, { show_alert: true });
    }
    return ctx.reply(ctx.dict.cancelNotAllowed);
  }

  const msg = customMessage || ctx.dict.orderCancelled;
  if ("callbackQuery" in ctx && ctx.callbackQuery) {
    try {
      await ctx.editMessageText(msg, { parse_mode: "Markdown" });
      await ctx.answerCbQuery();
    } catch (e: any) {
      if (!e.message?.includes("message is not modified")) {
        await ctx.reply(msg, { parse_mode: "Markdown" });
      }
    }
  } else {
    await ctx.reply(msg, { parse_mode: "Markdown" });
  }

  const loan = (await getLoan(loanId))!;
  const loanCreator = await getUser(loan.creatorId);
  const dict = getUserDict(loanCreator!.language);

  const draftAdapter = {
    amount: loan.amountFiat,
    fiat: loan.fiatCode,
    apr: loan.apr,
    ltv: loan.ltv,
    type: loan.type as LoanType,
    durationMonths: loan.durationMonths,
    paymentMethod: loan.paymentMethod,
  };

  const actionText = loan.type === "LEND" ? dict.actionLend : dict.actionBorrow;
  const buttonText =
    loan.type === "LEND" ? dict.btnTakeLoanBorrow : dict.btnTakeLoanLend;

  const sentChannelMsg = await ctx.telegram.sendMessage(
    process.env.PUBLIC_CHANNEL_ID!,
    dict.channelLoanOffer({
      action: actionText,
      draft: draftAdapter,
      user: loanCreator!,
      loanId: loan.id,
    }),
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        Markup.button.callback(
          `${buttonText} ${loan.fiatCode}`,
          `take_loan_${loan.id}`,
        ),
      ]),
    },
  );

  await db
    .update(loans)
    .set({ channelMessageId: sentChannelMsg.message_id })
    .where(eq(loans.id, loanId));

  return;
}
export async function handleTakeLoan(ctx: CallbackContext, loanId: string) {
  const takerId = ctx.from.id;
  if (!takerId) return;
  const user = ctx.user;
  const dict = ctx.dict;

  if (!user?.pubkey) {
    await ctx.telegram.sendMessage(takerId, dict.setYourPersonalPassword, {
      parse_mode: "Markdown",
    });
    return ctx.answerCbQuery();
  }

  const loan = await getLoan(loanId);
  if (!loan) return ctx.answerCbQuery(dict.orderNotFound, { show_alert: true });
  if (loan.creatorId === takerId)
    return ctx.answerCbQuery(dict.cantTakeOwnOrder, { show_alert: true });

  const activeLoans = await getUserLoans(takerId);
  const isBusy = activeLoans.some((l) => l.takerId === takerId);
  if (isBusy)
    return ctx.answerCbQuery(dict.alreadyHaveActiveOrder, { show_alert: true });

  const didTake = await tryTransitionLoanStatus(
    loanId,
    [LoanStatus.Pending],
    LoanStatus.WaitingTakerConfirmation,
    { takerId },
  );
  if (!didTake) return ctx.answerCbQuery(dict.orderTaken, { show_alert: true });

  const typeText = loan.type === "LEND" ? dict.borrowType : dict.lendType;

  await safeDeleteMsg(ctx);

  await ctx.telegram.sendMessage(
    takerId,
    dict.loanTakerAskConfirm({
      type: typeText,
      fiat: loan.fiatCode,
      amount: loan.amountFiat,
      apr: loan.apr,
      ltv: loan.ltv,
      duration: loan.durationMonths,
      method: escapeMarkdown(loan.paymentMethod),
      id: loan.id,
    }),
    {
      parse_mode: "Markdown",
      ...buildTakerConfirmKeyboard(dict.btnYes, dict.btnNo, `loan_${loan.id}`),
    },
  );
}

export async function handleLoanTakerConfirm(ctx: BotContext, loanId: string) {
  const takerId = ctx.from?.id;
  const loan = await getLoan(loanId);

  if (!loan || !takerId) return;
  if (
    loan.status !== LoanStatus.WaitingTakerConfirmation ||
    loan.takerId !== takerId
  ) {
    return ctx.answerCbQuery(ctx.dict.unauthorizedAccess, { show_alert: true });
  }

  const dict = getUserDict((await getUser(takerId))?.language);
  await ctx.editMessageReplyMarkup(undefined);

  let currentLockedAmount: number;
  if (loan.amountFiat.includes("-")) {
    ctx.session.awaitingAmountForLoan = loan.id;
    return ctx.reply(
      dict.promptLoanExactAmount(loan.amountFiat, loan.fiatCode),
      { parse_mode: "Markdown" },
    );
  } else {
    currentLockedAmount = parseFloat(loan.amountFiat);
    await db
      .update(loans)
      .set({ fiatAmountLocked: currentLockedAmount })
      .where(eq(loans.id, loanId));
  }

  if (loan.durationMonths.includes("-")) {
    ctx.session.awaitingDurationForLoan = loan.id;
    return ctx.reply(dict.promptLoanExactDuration(loan.durationMonths), {
      parse_mode: "Markdown",
    });
  }

  await askLoanTakerFinalConfirmation(ctx, {
    ...loan,
    fiatAmountLocked: currentLockedAmount,
  });
}

export async function proceedAfterLoanTakerAmount(
  ctx: BotContext,
  loan: typeof loans.$inferSelect,
) {
  if (loan.durationMonths.includes("-")) {
    ctx.session.awaitingDurationForLoan = loan.id;
    return ctx.reply(ctx.dict.promptLoanExactDuration(loan.durationMonths), {
      parse_mode: "Markdown",
    });
  }

  await askLoanTakerFinalConfirmation(ctx, loan);
}

export async function askLoanTakerFinalConfirmation(
  ctx: BotContext,
  loan: typeof loans.$inferSelect,
) {
  const dict = ctx.dict;
  const isTakerLender = loan.type === "BORROW";
  const role = isTakerLender ? "LENDER" : "BORROWER";

  const principal = loan.fiatAmountLocked!;
  const interest = getAccruedInterest(loan);

  const totalDebt = principal + interest;

  let estimatedCollateral = "0";

  try {
    const requiredFiatCollateral = totalDebt / (loan.ltv / 100);
    const rateInfo = await getRateInfoFor(
      requiredFiatCollateral,
      loan.fiatCode,
      0,
    );
    const collateralSats = rateInfo.satsAmount;

    estimatedCollateral = (collateralSats / 100_000_000).toFixed(8);
  } catch (e) {
    return republishLoanSilently(ctx as any, loan.id);
  }

  const text = dict.loanTakerFinalConfirm({
    role,
    fiat: loan.fiatCode,
    amount: principal.toString(),
    apr: loan.apr,
    ltv: loan.ltv,
    duration: loan.durationMonthsLocked,
    method: escapeMarkdown(loan.paymentMethod),
    id: loan.id,
    totalReturn: totalDebt.toFixed(2),
    estimatedCollateral,
  });

  await ctx.reply(text, {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard([
      [Markup.button.callback(dict.btnYes, `taker_final_yes_loan_${loan.id}`)],
      [
        Markup.button.callback(
          dict.btnNo,
          `taker_cancel_order_loan_${loan.id}`,
        ),
      ],
    ]),
  });
}

export async function proceedToLoanMakerConfirmation(
  ctx: BotContext,
  loanOrId: string | LoanRecord,
) {
  let loan: LoanRecord;
  if (typeof loanOrId === "string") loan = (await getLoan(loanOrId))!;
  else loan = loanOrId;

  const dict = ctx.dict;

  await ctx.editMessageReplyMarkup(undefined);
  await ctx.reply(dict.waitLoanMaker, { parse_mode: "Markdown" });

  const principal = loan.fiatAmountLocked!;
  const interest = getAccruedInterest(loan);
  const totalDebt = principal + interest;
  const requiredFiatCollateral = totalDebt / (loan.ltv / 100);

  let baseSats = 0;
  try {
    const rateInfo = await getRateInfoFor(
      requiredFiatCollateral,
      loan.fiatCode,
      0,
    );
    baseSats = rateInfo.satsAmount;
  } catch (error) {
    return republishLoanSilently(ctx as any, loan.id);
  }

  await db
    .update(loans)
    .set({
      collateralSats: baseSats,
      status: LoanStatus.WaitingMakerConfirmation,
    })
    .where(eq(loans.id, loan.id));

  const taker = await getUser(loan.takerId!);
  const makerDict = getUserDict((await getUser(loan.creatorId))?.language);
  const daysUsing = taker
    ? Math.floor((Date.now() - taker.createdAt) / 86400000)
    : 0;

  const isMakerLender = loan.type === "LEND";
  const role = isMakerLender ? "LENDER" : "BORROWER";

  const collateralBtc = (baseSats / 100_000_000).toFixed(8);

  await ctx.telegram.sendMessage(
    loan.creatorId,
    makerDict.loanMakerAskConfirm({
      role,
      fiat: loan.fiatCode,
      amount: principal.toString(),
      apr: loan.apr,
      ltv: loan.ltv,
      duration: loan.durationMonthsLocked,
      method: escapeMarkdown(loan.paymentMethod),
      totalReturn: totalDebt.toFixed(2),
      collateralSats: collateralBtc,
      trades: taker?.tradesCount || 0,
      days: daysUsing,
      rating: taker?.rating || 0,
      id: loan.id,
    }),
    {
      parse_mode: "Markdown",
      ...buildMakerConfirmKeyboard(
        makerDict.btnYes,
        makerDict.btnNo,
        `loan_${loan.id}`,
      ),
    },
  );
}

export async function handleLoanMakerConfirm(
  ctx: CallbackContext,
  loanId: string,
) {
  const makerId = ctx.from.id;
  const loan = await getLoan(loanId);

  if (!loan || !makerId) return;
  if (loan.status !== LoanStatus.WaitingMakerConfirmation) return;

  if (loan.creatorId !== makerId) {
    return ctx.answerCbQuery(ctx.dict.unauthorizedAccess, { show_alert: true });
  }

  await ctx.editMessageReplyMarkup(undefined);

  const didTransition = await tryTransitionLoanStatus(
    loanId,
    [LoanStatus.WaitingMakerConfirmation],
    LoanStatus.WaitingCollateral,
  );

  if (didTransition) {
    await initializeLoanEscrow(ctx, loanId);
  }
}

export async function handleConfirmReceipt(ctx: BotContext, loanId: string) {
  const contract = await getContract<LoanRecord>(loanId);
  if (!contract || !contract.isLoan) {
    return ctx.answerCbQuery(ctx.dict.orderNotFound, { show_alert: true });
  }

  const didTransition = await tryTransitionContract(
    contract,
    [LoanStatus.DisbursementSent],
    LoanStatus.Active,
    { loanStartAt: Date.now() },
  );

  if (!didTransition) {
    await safeRemoveMarkup(ctx);
    return ctx.answerCbQuery(ctx.dict.cancelNotAllowed, { show_alert: true });
  }

  await ctx.editMessageText(ctx.dict.receiptConfirmedBorrower(loanId), {
    parse_mode: "Markdown",
  });

  const lender = await getUser(contract.sellerOrLenderId!);
  if (lender) {
    const lenderDict = getUserDict(lender.language);
    await ctx.telegram.sendMessage(
      lender.telegramId,
      lenderDict.receiptConfirmedLender(loanId),
      { parse_mode: "Markdown" },
    );
  }
}
