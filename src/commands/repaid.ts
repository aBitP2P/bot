import { Markup } from "telegraf";
import {
  getAccruedInterest,
  getContract,
  getUnifiedUserContractsForAction,
  tryTransitionContract,
  type UnifiedContract,
} from "../db/contracts.js";
import { buildOrderSelectKeyboard, buildRatingKeyboard } from "../shared/keyboards.js";
import type { CallbackContext, CommandContext, LoanRecord } from "../types.js";
import { getUser } from "../db/users.js";
import { createLoanPaymentRequest, hasPendingLoanPayment } from "../db/loans.js";
import { getUserDict } from "../locales/index.js";
import { LoanStatus } from "../shared/constants.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { inArray, sql } from "drizzle-orm";
import { safeRemoveMarkup } from "../utils/telegram.js";

export async function repaidCommand(ctx: CommandContext) {
  const args = ctx.message.text.split(" ");
  let activeContracts = await getUnifiedUserContractsForAction(
    ctx.user.telegramId,
    "REPAY",
  );
  if (args.length < 2) {
    if (activeContracts.length < 1)
      return await ctx.reply(ctx.dict.noActiveLoansFound);

    return await ctx.reply(ctx.dict.selectRepaidLoan, {
      ...buildOrderSelectKeyboard(activeContracts, "repayCommand"),
    });
  }
  let loanId = args[1] as string;
  let contractFound = await getContract<LoanRecord>(loanId);
  if (
    !contractFound ||
    !contractFound.isLoan ||
    !activeContracts.find((x) => x.id === contractFound.data.id)
  )
    return await ctx.reply(ctx.dict.orderNotFound);

  return await handleRepaymentPreview(ctx, contractFound);
}

export async function handleRepaymentPreview(
  ctx: CommandContext | CallbackContext,
  contract: UnifiedContract<LoanRecord>,
) {
  if (!contract.isLoan || ctx.session.awaitingRepaidAmountForLoan) return;
  if (await hasPendingLoanPayment(contract.data.id)) 
    return await ctx.reply(ctx.dict.loanRepaymentAlreadyPending(contract.data.id), { parse_mode: "Markdown" })
  // Primero se muestra la cantidad total a pagar (con intereses)
  // Sin embargo, solo es informativo, se le pregunta al usuario la cantidad que ha pagado al prestamista.
  // Puede ser una parte (depende si el prestamista acepta el pago de aquella parte)
  // asi como puede ser el pago completo, pero como cuestión de términos, se deberá de
  // pagar los intereses de todo el periodo acordado anteriormente entre las dos partes.
  const accruedInterest = getAccruedInterest(contract.data);
  ctx.session.awaitingRepaidAmountForLoan = contract.data.id;
  await ctx.reply(
    ctx.dict.promptRepayAmount(
      contract.data.fiatAmountLocked!,
      accruedInterest,
      contract.data.amountRepaid!,
      contract.data.fiatCode,
      (await getUser(contract.sellerOrLenderId!))!.username,
    ),
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        Markup.button.callback(
          ctx.dict.btnRepayFull,
          "fullyRepaid_" + contract.data.id,
        ),
      ]),
    },
  );
}

export async function handleRepaymentRequest(
  ctx: CommandContext | CallbackContext,
  contract: UnifiedContract<LoanRecord>,
  amount: number,
) {
  const hasPending = await hasPendingLoanPayment(contract.data.id);
  if (hasPending) {
    await safeRemoveMarkup(ctx);
    return await ctx.reply(ctx.dict.hasPendingPayment);
  }
  const paymentId = await createLoanPaymentRequest(contract, amount);

  const lender = await getUser(contract.sellerOrLenderId!);
  if (!lender) return;
  
  const lenderDict = getUserDict(lender.language);
  const borrowerUsername = ctx.from?.username || "Usuario";

  await ctx.telegram.sendMessage(
    lender.telegramId,
    lenderDict.paymentReported(borrowerUsername, amount, contract.data.fiatCode, contract.data.id),
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback(lenderDict.btnConfirmPayment, `confirmPay_${paymentId}`)],
        [Markup.button.callback(lenderDict.btnRejectPayment, `rejectPay_${paymentId}`)]
      ])
    }
  );

  await ctx.reply(ctx.dict.paymentPendingConfirmation, { parse_mode: "Markdown" });
}

export async function handleLoanFullRepay(
  ctx: CommandContext | CallbackContext,
  contract: UnifiedContract<LoanRecord>
) {
  const borrowerId = contract.buyerOrBorrowerId!;
  const lenderId = contract.sellerOrLenderId!;

  const didTransition = await tryTransitionContract(
    contract,
    [LoanStatus.Active], 
    LoanStatus.Releasable
  );

  if (!didTransition) return;

  await db
    .update(users)
    .set({ tradesCount: sql`${users.tradesCount} + 1` })
    .where(inArray(users.telegramId, [borrowerId, lenderId]));

  const borrower = await getUser(borrowerId);
  const lender = await getUser(lenderId);
  const borrowerDict = getUserDict(borrower?.language);
  const lenderDict = getUserDict(lender?.language);

  await ctx.telegram.sendMessage(
    lenderId, 
    lenderDict.loanFullyRepaidLender(contract.data.id), 
    { parse_mode: "Markdown" }
  );
  await ctx.telegram.sendMessage(
    lenderId, 
    lenderDict.rateCounterpartyMessage, 
    { ...buildRatingKeyboard(contract.data.id) }
  );

  await ctx.telegram.sendMessage(
    borrowerId, 
    borrowerDict.loanFullyRepaidBorrower(contract.data.id), 
    { parse_mode: "Markdown" }
  );
  await ctx.telegram.sendMessage(
    borrowerId, 
    borrowerDict.rateCounterpartyMessage, 
    { ...buildRatingKeyboard(contract.data.id) }
  );
}