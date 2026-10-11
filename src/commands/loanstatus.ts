import { eq } from "drizzle-orm";
import { checkEscrowFunding } from "../core/bitcoin/transactions.js";
import { getAccruedInterest, getContract } from "../db/contracts.js";
import { db } from "../db/index.js";
import { loans } from "../db/schema.js";
import type { CommandContext, LoanRecord } from "../types.js";
import { getRateInfoFor } from "../utils/price.js";
import { getUser } from "../db/users.js";
import { LTV_LIQUIDATION_THRESHOLD } from "../shared/constants.js";

export async function loanStatusCommand(ctx: CommandContext) {
  const messageText = ctx.message && "text" in ctx.message ? ctx.message.text : "";
  const loanId = messageText.split(" ")[1];

  if (!loanId) {
    return ctx.reply(ctx.dict.invalidCommandUsage("/loanstatus <LOAN_ID>"), { parse_mode: "Markdown" });
  }

  const contract = await getContract<LoanRecord>(loanId);
  if (!contract || !contract.isLoan) {
    return ctx.reply(ctx.dict.orderNotFound);
  }

  const userId = ctx.from!.id;
  const isBorrower = contract.buyerOrBorrowerId === userId;
  const isLender = contract.sellerOrLenderId === userId;

  if (!isBorrower && !isLender) {
    return ctx.reply(ctx.dict.unauthorizedAccess);
  }

  const principal = contract.data.fiatAmountLocked!;
  const accruedInterest = getAccruedInterest(contract.data);
  const totalDebt = principal + accruedInterest;
  const amountRepaid = contract.data.amountRepaid!;
  const remainingDebt = totalDebt - amountRepaid;

  const role = isBorrower ? ctx.dict.roleBorrower : ctx.dict.roleLender;

  const { appliedRate } = await getRateInfoFor(1, contract.data.fiatCode!, 0);
  
  let collateralSats = contract.amountSatsOrCollateral;
  const fundingInfo = await checkEscrowFunding(contract.data.escrowAddress!);
  if (fundingInfo?.totalFundedSats !== collateralSats) {
    collateralSats = fundingInfo!.totalFundedSats;
    await db.update(loans).set({ collateralSats }).where(eq(loans.id, contract.data.id!))
  }
  const collateralFiatValue = (collateralSats / 100_000_000) * appliedRate;
  
  const currentLtv = collateralFiatValue > 0 
    ? (remainingDebt / collateralFiatValue) * 100 
    : 0;

  let user = await getUser(contract.buyerOrBorrowerId!);

  await ctx.reply(
    ctx.dict.loanStatusMessage({
      id: contract.data.id,
      role: role,
      status: contract.data.status!,
      apr: contract.data.apr!,
      borrower: user!.username,
      escrowAddress: contract.data.escrowAddress!,
      liquidationLtv: LTV_LIQUIDATION_THRESHOLD,
      fiatCode: contract.data.fiatCode!,
      fPrincipal: principal.toFixed(2),
      fInterest: accruedInterest.toFixed(2),
      fTotal: totalDebt.toFixed(2),
      fRepaid: amountRepaid.toFixed(2),
      fRemaining: Math.max(0, remainingDebt).toFixed(2),
      fLtv: currentLtv.toFixed(2),
    }),
    { parse_mode: "Markdown" }
  );
}