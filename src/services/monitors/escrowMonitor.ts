import { eq, or } from "drizzle-orm";
import type { Telegraf } from "telegraf";
import type { BotContext } from "../../types.js";
import { db } from "../../db/index.js";
import { loans, orders } from "../../db/schema.js";
import { getUser } from "../../db/users.js";
import { tryTransitionLoanStatus } from "../../db/loans.js";
import { tryTransitionOrderStatus } from "../../db/orders.js";
import { LoanStatus, OrderStatus } from "../../shared/constants.js";
import {
  checkEscrowFunding,
  evaluateFundingHealth,
  fetchMempool,
} from "../../core/bitcoin/index.js";
import { getBotFeePercent } from "../../config/fees.js";
import { getLoanParties, getParties } from "../../utils/parties.js";
import { getUserDict } from "../../locales/index.js";
import { safeNotify } from "../../utils/telegram.js";
import { escapeMarkdown } from "../../utils/format.js";

const notifiedPartial = new Set<string>();

export function startEscrowMonitor(bot: Telegraf<BotContext>) {
  setInterval(async () => {
    const [pendingOrders, pendingLoans] = await Promise.all([
      db
        .select()
        .from(orders)
        .where(
          or(
            eq(orders.status, OrderStatus.WaitingEscrow),
            eq(orders.status, OrderStatus.Unconfirmed),
          ),
        ),
      db
        .select()
        .from(loans)
        .where(
          or(
            eq(loans.status, LoanStatus.WaitingCollateral),
            eq(loans.status, LoanStatus.CollateralUnconfirmed),
          ),
        ),
    ]);

    if (pendingOrders.length === 0 && pendingLoans.length === 0) return;

    let currentHeight = 0;
    try {
      const tipRes = await fetchMempool("blocks/tip/height");
      if (tipRes.ok) currentHeight = parseInt(await tipRes.text(), 10);
    } catch (e) {
      return;
    }

    const wrappers = [];

    for (const order of pendingOrders) {
      if (!order.escrowAddress) continue;
      const { buyerId, sellerId } = getParties(order);
      const seller = await getUser(sellerId!);
      const buyer = await getUser(buyerId!);
      const botFeePercent = getBotFeePercent(order.amountSats);
      const feeSats = Math.floor(order.amountSats * (botFeePercent / 2 / 100));

      wrappers.push({
        type: "ORDER",
        id: order.id,
        escrowAddress: order.escrowAddress,
        expectedSats: order.amountSats + feeSats,
        feeSats,
        isUnconfirmedState: order.status === OrderStatus.Unconfirmed,
        isWaitingState: order.status === OrderStatus.WaitingEscrow,
        funderId: sellerId!, // Funder = Seller
        waiterId: buyerId!, // Waiter = Buyer
        funder: seller,
        waiter: buyer,
        dictFunder: getUserDict(seller?.language),
        dictWaiter: getUserDict(buyer?.language),
        originalData: order,
      });
    }

    for (const loan of pendingLoans) {
      if (!loan.escrowAddress) continue;
      const { lenderId, borrowerId } = getLoanParties(loan);
      const lender = await getUser(lenderId!);
      const borrower = await getUser(borrowerId!);
      const botFeePercent = getBotFeePercent(loan.collateralSats);
      const feeSats = Math.floor(loan.collateralSats * (botFeePercent / 100));

      wrappers.push({
        type: "LOAN",
        id: loan.id,
        escrowAddress: loan.escrowAddress,
        expectedSats: loan.collateralSats + feeSats,
        feeSats,
        isUnconfirmedState: loan.status === LoanStatus.CollateralUnconfirmed,
        isWaitingState: loan.status === LoanStatus.WaitingCollateral,
        funderId: borrowerId!, // Funder = Borrower
        waiterId: lenderId!, // Waiter = Lender
        funder: borrower,
        waiter: lender,
        dictFunder: getUserDict(borrower?.language),
        dictWaiter: getUserDict(lender?.language),
        originalData: loan,
      });
    }

    for (const contract of wrappers) {
      await new Promise((res) => setTimeout(res, 500));

      const fundingInfo = await checkEscrowFunding(
        contract.escrowAddress,
        currentHeight,
      );
      if (!fundingInfo) continue;

      const health = evaluateFundingHealth({
        fundingInfo,
        expectedSats: contract.expectedSats,
        isUnconfirmedState: contract.isUnconfirmedState,
        isWaitingState: contract.isWaitingState,
        hasNotifiedPartial: notifiedPartial.has(contract.id),
      });

      switch (health.type) {
        case "CANCEL":
          if (health.reason === "TRANSACTION_DISAPPEARED") {
            const didCancel =
              contract.type === "ORDER"
                ? await tryTransitionOrderStatus(
                    contract.id,
                    [OrderStatus.Unconfirmed],
                    OrderStatus.Cancelled,
                  )
                : await tryTransitionLoanStatus(
                    contract.id,
                    [LoanStatus.CollateralUnconfirmed],
                    LoanStatus.Cancelled,
                  );

            if (didCancel) {
              await bot.telegram.sendMessage(
                contract.funderId,
                contract.dictFunder.orderCancelledTransactionDisappeared,
                { parse_mode: "Markdown" },
              );
              await bot.telegram.sendMessage(
                contract.waiterId,
                contract.dictWaiter.orderCancelledSellerDepositReverted,
                { parse_mode: "Markdown" },
              );
            }
          }
          break;

        case "REFUND":
          const didRefund =
            contract.type === "ORDER"
              ? await tryTransitionOrderStatus(
                  contract.id,
                  [OrderStatus.WaitingEscrow, OrderStatus.Unconfirmed],
                  OrderStatus.Refundable,
                )
              : await tryTransitionLoanStatus(
                  contract.id,
                  [
                    LoanStatus.WaitingCollateral,
                    LoanStatus.CollateralUnconfirmed,
                  ],
                  LoanStatus.Refundable,
                );

          if (didRefund) {
            if (health.reason === "TAMPERING_DETECTED") {
              await bot.telegram.sendMessage(
                contract.funderId,
                contract.dictFunder.tamperingDetected,
                { parse_mode: "Markdown" },
              );
              await bot.telegram.sendMessage(
                contract.waiterId,
                contract.dictWaiter.orderCancelledDepositAltered,
                { parse_mode: "Markdown" },
              );
            } else if (health.reason === "MAX_UTXOS_REACHED") {
              notifiedPartial.delete(contract.id);
              await bot.telegram.sendMessage(
                contract.funderId,
                contract.dictFunder.escrowFundingFailed(
                  fundingInfo.utxoCount,
                  fundingInfo.totalFundedSats,
                  contract.expectedSats,
                  contract.id,
                ),
                { parse_mode: "Markdown" },
              );
              await bot.telegram.sendMessage(
                contract.waiterId,
                contract.dictWaiter.orderCancelledSellerFunding,
                { parse_mode: "Markdown" },
              );
            }
          }
          break;

        case "NOTIFY_PARTIAL":
          notifiedPartial.add(contract.id);
          await bot.telegram.sendMessage(
            contract.funderId,
            contract.dictFunder.incompleteFunding(
              fundingInfo.totalFundedSats,
              contract.expectedSats,
              health.remainingSats,
            ),
            { parse_mode: "Markdown" },
          );
          break;

        case "MARK_UNCONFIRMED":
          notifiedPartial.delete(contract.id);
          const didMarkUnconfirmed =
            contract.type === "ORDER"
              ? await tryTransitionOrderStatus(
                  contract.id,
                  [OrderStatus.WaitingEscrow],
                  OrderStatus.Unconfirmed,
                )
              : await tryTransitionLoanStatus(
                  contract.id,
                  [LoanStatus.WaitingCollateral],
                  LoanStatus.CollateralUnconfirmed,
                );

          if (didMarkUnconfirmed) {
            await bot.telegram.sendMessage(
              contract.funderId,
              contract.dictFunder.escrowUnconfirmed(contract.escrowAddress),
              { parse_mode: "Markdown" },
            );
            await bot.telegram.sendMessage(
              contract.waiterId,
              contract.dictWaiter.escrowUnconfirmed(contract.escrowAddress),
              { parse_mode: "Markdown" },
            );
          }
          break;

        case "PROCEED":
          notifiedPartial.delete(contract.id);
          const funderContact = "@" + escapeMarkdown(contract.funder!.username);
          const waiterContact = "@" + escapeMarkdown(contract.waiter!.username);

          if (contract.type === "ORDER") {
            if (contract.originalData.status === OrderStatus.Active) break;
            const didProceed = await tryTransitionOrderStatus(
              contract.id,
              [OrderStatus.WaitingEscrow, OrderStatus.Unconfirmed],
              OrderStatus.Active,
            );

            if (didProceed) {
              await safeNotify(bot, contract.funderId, (dict) =>
                dict.escrowConfirmedSeller(waiterContact, contract.id),
              );
              await safeNotify(bot, contract.waiterId, (dict) =>
                dict.escrowConfirmedBuyer(funderContact, contract.id),
              );

              // Alerta de sobre-fondeo 
              const excessSats =
                fundingInfo.totalFundedSats - contract.expectedSats;
              if (excessSats > 546) {
                const ADMIN_GROUP_ID = process.env.ADMIN_GROUP_ID;
                if (ADMIN_GROUP_ID) {
                  const username = contract.funder?.username
                    ? escapeMarkdown(contract.funder.username)
                    : `ID: ${contract.funderId}`;
                  await bot.telegram.sendMessage(
                    ADMIN_GROUP_ID,
                    `⚠️ *ALERTA DE SOBRE-FONDEO (P2P CLÁSICO)*\n\n` +
                      `El vendedor @${username} ha enviado más fondos de los solicitados en la orden \`${contract.id}\`.\n\n` +
                      `Esperado: \`${contract.expectedSats}\` sats\n` +
                      `Recibido: \`${fundingInfo.totalFundedSats}\` sats\n` +
                      `Exceso a recuperar: \`${excessSats}\` sats\n\n` +
                      `_Nota: El exceso será enviado a la billetera de comisiones al finalizar la orden. Contacte al usuario._`,
                    { parse_mode: "Markdown" },
                  );
                }
              }
            }
          } else {
            if (contract.originalData.status === LoanStatus.WaitingDisbursement)
              break;
            const actualCollateralDeposited =
              health.actualSats - contract.feeSats;
            const didProceed = await tryTransitionLoanStatus(
              contract.id,
              [LoanStatus.WaitingCollateral, LoanStatus.CollateralUnconfirmed],
              LoanStatus.WaitingDisbursement,
              { collateralSats: actualCollateralDeposited },
            );

            if (didProceed) {
              await safeNotify(bot, contract.funderId, (dict) =>
                dict.loanCollateralSecuredBorrower(waiterContact, contract.id),
              );
              await safeNotify(bot, contract.waiterId, (dict) =>
                dict.loanCollateralSecuredLender(
                  funderContact,
                  contract.originalData.fiatAmountLocked!,
                  contract.originalData.fiatCode,
                  contract.id,
                ),
              );
            }
          }
          break;

        case "IGNORE":
          break;
      }
    }
  }, 60000);
}
