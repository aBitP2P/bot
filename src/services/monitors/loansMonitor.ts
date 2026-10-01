import { eq, or } from "drizzle-orm";
import type { Telegraf } from "telegraf";
import type { BotContext } from "../../types.js";
import { db } from "../../db/index.js";
import { loans } from "../../db/schema.js";
import { getUser } from "../../db/users.js";
import { tryTransitionLoanStatus } from "../../db/loans.js";
import { LoanStatus } from "../../shared/constants.js";
import { checkEscrowFunding, fetchMempool } from "../../core/bitcoin/index.js";
import { getBotFeePercent } from "../../config/fees.js";
import { getLoanParties } from "../../utils/parties.js";
import { getUserDict } from "../../locales/index.js";
import { safeNotify } from "../../utils/telegram.js";
import { escapeMarkdown } from "../../utils/format.js";

const notifiedPartialLoan = new Set<string>();

export function startLoanEscrowMonitor(bot: Telegraf<BotContext>) {
  setInterval(async () => {
    const pendingLoans = await db
      .select()
      .from(loans)
      .where(
        or(
          eq(loans.status, LoanStatus.WaitingCollateral),
          eq(loans.status, LoanStatus.CollateralUnconfirmed),
        ),
      );

    if (pendingLoans.length === 0) return;

    let currentHeight = 0;
    try {
      const tipRes = await fetchMempool("blocks/tip/height");
      if (tipRes.ok) currentHeight = parseInt(await tipRes.text(), 10);
    } catch (e) {
      return; 
    }

    for (const loan of pendingLoans) {
      await new Promise((res) => setTimeout(res, 500)); 
      if (!loan.escrowAddress) continue;

      const fundingInfo = await checkEscrowFunding(loan.escrowAddress, currentHeight);
      if (!fundingInfo) continue;

      const baseSats = loan.collateralSats;
      const botFeePercent = getBotFeePercent(baseSats);
      const borrowerFeeSats = Math.floor(baseSats * (botFeePercent / 100));
      const expectedSats = baseSats + borrowerFeeSats; 

      const { lenderId, borrowerId } = getLoanParties(loan);
      const lender = await getUser(lenderId!);
      const borrower = await getUser(borrowerId!);
      const dictLender = getUserDict(lender?.language);
      const dictBorrower = getUserDict(borrower?.language);

      if (fundingInfo.totalFundedSats < expectedSats) {
        
        if (loan.status === LoanStatus.CollateralUnconfirmed) {
          if (fundingInfo.totalFundedSats === 0) {
            const didCancel = await tryTransitionLoanStatus(loan.id, [LoanStatus.CollateralUnconfirmed], LoanStatus.Cancelled);
            if (didCancel) {
              await bot.telegram.sendMessage(borrowerId!, dictBorrower.orderCancelledTransactionDisappeared, { parse_mode: "Markdown" });
              await bot.telegram.sendMessage(lenderId!, dictLender.orderCancelledSellerDepositReverted, { parse_mode: "Markdown" });
            }
          } else {
            const didTransition = await tryTransitionLoanStatus(loan.id, [LoanStatus.CollateralUnconfirmed], LoanStatus.Refundable);
            if (didTransition) {
              await bot.telegram.sendMessage(borrowerId!, dictBorrower.tamperingDetected, { parse_mode: "Markdown" });
              await bot.telegram.sendMessage(lenderId!, dictLender.orderCancelledDepositAltered, { parse_mode: "Markdown" });
            }
          }
          continue;
        }

        if (fundingInfo.utxoCount >= 2) {
          notifiedPartialLoan.delete(loan.id);
          const didTransition = await tryTransitionLoanStatus(loan.id, [LoanStatus.WaitingCollateral, LoanStatus.CollateralUnconfirmed], LoanStatus.Refundable);
          if (didTransition) {
            await bot.telegram.sendMessage(
              borrowerId!,
              dictBorrower.escrowFundingFailed(fundingInfo.utxoCount, fundingInfo.totalFundedSats, expectedSats, loan.id),
              { parse_mode: "Markdown" },
            );
            await bot.telegram.sendMessage(lenderId!, dictLender.orderCancelledSellerFunding, { parse_mode: "Markdown" });
          }
        } 
        else if (fundingInfo.utxoCount === 1) {
          if (!notifiedPartialLoan.has(loan.id)) {
            notifiedPartialLoan.add(loan.id);
            const remainingSats = expectedSats - fundingInfo.totalFundedSats;
            await bot.telegram.sendMessage(
              borrowerId!,
              dictBorrower.incompleteFunding(fundingInfo.totalFundedSats, expectedSats, remainingSats),
              { parse_mode: "Markdown" },
            );
          }
        }
        continue;
      }

      // Casos de fondeo completo o sobre-colaterizado
      notifiedPartialLoan.delete(loan.id);

      if (loan.status === LoanStatus.WaitingCollateral && !fundingInfo.confirmed) {
        const didTransition = await tryTransitionLoanStatus(loan.id, [LoanStatus.WaitingCollateral], LoanStatus.CollateralUnconfirmed);
        if (didTransition) {
          await bot.telegram.sendMessage(borrowerId!, dictBorrower.escrowUnconfirmed(loan.escrowAddress), { parse_mode: "Markdown" });
          await bot.telegram.sendMessage(lenderId!, dictLender.escrowUnconfirmed(loan.escrowAddress), { parse_mode: "Markdown" });
        }
      }

      if (fundingInfo.confirmed && loan.status !== LoanStatus.WaitingDisbursement) {
        
        const actualCollateralDeposited = fundingInfo.totalFundedSats - borrowerFeeSats;

        const didTransition = await tryTransitionLoanStatus(
          loan.id,
          [LoanStatus.WaitingCollateral, LoanStatus.CollateralUnconfirmed],
          LoanStatus.WaitingDisbursement,
          { 
            loanStartAt: Date.now(),
            collateralSats: actualCollateralDeposited
          }
        );

        if (!didTransition) continue;

        const borrowerContact = "@" + escapeMarkdown(borrower!.username);
        const lenderContact = "@" + escapeMarkdown(lender!.username);

        await safeNotify(bot, borrowerId!, (dict) => dict.loanCollateralSecuredBorrower(lenderContact, loan.id));
        await safeNotify(bot, lenderId!, (dict) => dict.loanCollateralSecuredLender(borrowerContact, loan.fiatAmountLocked!, loan.fiatCode, loan.id));
      }
    }
  }, 60000); 
}