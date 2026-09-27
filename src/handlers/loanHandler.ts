import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { loans } from "../db/schema.js";
import { type CallbackContext, type CommandContext } from "../types.js";
import { getUser } from "../db/users.js";
import { getUserDict } from "../locales/index.js";
import { Markup } from "telegraf";
import { getLoan, tryTransitionLoanStatus } from "../db/loans.js";
import { LoanStatus } from "../shared/constants.js";

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
  const buttonText = loan.type === "LEND" ? dict.btnTakeLoanBorrow : dict.btnTakeLoanLend;

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