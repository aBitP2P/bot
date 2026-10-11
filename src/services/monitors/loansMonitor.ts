import { eq } from "drizzle-orm";
import type { Telegraf } from "telegraf";
import type { BotContext } from "../../types.js";
import { db } from "../../db/index.js";
import { loanNotifications, loans } from "../../db/schema.js";
import { tryTransitionLoanStatus } from "../../db/loans.js";
import { LoanStatus, LTV_LIQUIDATION_THRESHOLD } from "../../shared/constants.js";
import { getRateInfoFor } from "../../utils/price.js";
import { safeNotify } from "../../utils/telegram.js";
import { getLoanParties } from "../../utils/parties.js";
import { getAccruedInterest } from "../../db/contracts.js";
import { checkEscrowFunding } from "../../core/bitcoin/transactions.js";

const LTV_WARNING_THRESHOLD = 75;
const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000; // 1 día de gracia para pagar

let isCheckingLoans = false;

export function startLoansMonitor(bot: Telegraf<BotContext>) {
  setInterval(
    async () => {
      if (isCheckingLoans) return;
      isCheckingLoans = true;

      try {
        const activeLoans = await db
          .select()
          .from(loans)
          .where(eq(loans.status, LoanStatus.Active));

        if (activeLoans.length === 0) return;

        const now = Date.now();

        for (const loan of activeLoans) {
          if (
            !loan.loanStartAt ||
            !loan.durationMonthsLocked ||
            !loan.fiatAmountLocked
          )
            continue;
          const { borrowerId, lenderId } = getLoanParties(loan);

          const durationMs =
            loan.durationMonthsLocked * 30 * 24 * 60 * 60 * 1000;
          const dueDate = loan.loanStartAt + durationMs;
          const expirationWithGrace = dueDate + GRACE_PERIOD_MS;

          if (now >= expirationWithGrace) {
            const didTransition = await tryTransitionLoanStatus(
              loan.id,
              [LoanStatus.Active],
              LoanStatus.Expired,
            );
            if (didTransition) {
              await safeNotify(bot, borrowerId!, (dict) =>
                dict.loanExpiredBorrower(loan.id),
              );
              await safeNotify(bot, lenderId!, (dict) =>
                dict.loanExpiredLender(loan.id),
              );
              continue;
            }
          }

          // LTV
          try {
            const principal = loan.fiatAmountLocked;
            const interest = getAccruedInterest(loan);
            const remainingDebt =
              principal + interest - (loan.amountRepaid || 0);

            const rateInfo = await getRateInfoFor(
              remainingDebt,
              loan.fiatCode,
              0,
            );
            const currentRequiredSatsForPrincipal = rateInfo.satsAmount;

            const currentLTV =
              (currentRequiredSatsForPrincipal / loan.collateralSats) * 100;
            console.log(currentLTV)
            if (currentLTV >= LTV_LIQUIDATION_THRESHOLD) {
              // Volver a revisar el escrow, por si se agregó colateral (solo se toma en cuenta lo confirmado 2 veces)
              let fundingInfo = await checkEscrowFunding(loan.escrowAddress!);
              if (fundingInfo!.totalFundedSats !== loan.collateralSats) {
                await db
                  .update(loans)
                  .set({ collateralSats: fundingInfo?.totalFundedSats })
                  .where(eq(loans.id, loan.id));
                
                let newLTV = (currentRequiredSatsForPrincipal / fundingInfo!.totalFundedSats) * 100;
                if (newLTV < LTV_LIQUIDATION_THRESHOLD) continue;
              }
              const didTransition = await tryTransitionLoanStatus(
                loan.id,
                [LoanStatus.Active],
                LoanStatus.Liquidatable,
              );

              if (didTransition) {
                await safeNotify(bot, borrowerId!, (dict) =>
                  dict.ltvLiquidatedBorrower(loan.id),
                );
                await safeNotify(bot, lenderId!, (dict) =>
                  dict.ltvLiquidatedLender(loan.id),
                );
              }
              continue;
            }

            // Alerta preventiva al 75%
            if (currentLTV >= LTV_WARNING_THRESHOLD) {
              const [notificationRecord] = await db
                .select()
                .from(loanNotifications)
                .where(eq(loanNotifications.loanId, loan.id))
                .limit(1);

              const warningAlreadySent =
                notificationRecord?.ltvWarningSent === 1;
              if (!warningAlreadySent) {
                await safeNotify(bot, borrowerId!, (dict) =>
                  dict.ltvWarning(currentLTV, LTV_LIQUIDATION_THRESHOLD),
                );

                await db
                  .insert(loanNotifications)
                  .values({ loanId: loan.id, ltvWarningSent: 1 })
                  .onDuplicateKeyUpdate({ set: { ltvWarningSent: 1 } });
              }
            }
          } catch (priceError) {
            console.error(
              `Error obteniendo precio para LTV del préstamo ${loan.id}:`,
              priceError,
            );
          }
        }
      } catch (err) {
        console.error("Error en monitor de préstamos:", err);
      } finally {
        isCheckingLoans = false;
      }
    },
    0.3 * 60 * 1000,
  ); // Ejecutar cada 5 minutos
}
