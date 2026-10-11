import { and, eq, lte } from "drizzle-orm";
import { db } from "../../db/index.js";
import { orders, loans } from "../../db/schema.js";
import { checkEscrowFunding } from "../../core/bitcoin/index.js";
import { Telegraf } from "telegraf";
import { type BotContext } from "../../types.js";
import { tryTransitionOrderStatus } from "../../db/orders.js";
import { tryTransitionLoanStatus } from "../../db/loans.js";
import { republishOrderSilently } from "../../handlers/orderHandler.js";
import { republishLoanSilently } from "../../handlers/loanHandler.js";
import { getParties, getLoanParties } from "../../utils/parties.js";
import { safeNotify } from "../../utils/telegram.js";
import { OrderStatus, LoanStatus } from "../../shared/constants.js";

const FORTY_SEVEN_HOURS_MS = 47 * 60 * 60 * 1000;
const PUBLIC_CHANNEL_ID = process.env.PUBLIC_CHANNEL_ID;
const LOANS_CHANNEL_ID = process.env.LOANS_CHANNEL_ID;
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;
let isCheckingTimeouts = false;

export function startTimeoutsMonitor(bot: Telegraf<BotContext>) {
  setInterval(async () => {
    if (isCheckingTimeouts) return;
    isCheckingTimeouts = true;

    try {
      const now = Date.now();
      const expirationThreshold = now - FORTY_SEVEN_HOURS_MS;
      const timeoutThreshold = now - FIFTEEN_MINUTES_MS;
      const escrowThreshold = now - ONE_HOUR_MS;
      // prettier-ignore
      const [
        pendingOrders, pendingLoans,
        takerOrders, takerLoans,
        makerOrders, makerLoans,
        escrowOrders, escrowLoans
      ] = await Promise.all([
        db.select().from(orders).where(and(eq(orders.status, OrderStatus.Pending), lte(orders.createdAt, expirationThreshold))),
        db.select().from(loans).where(and(eq(loans.status, LoanStatus.Pending), lte(loans.createdAt, expirationThreshold))),
        db.select().from(orders).where(and(eq(orders.status, OrderStatus.WaitingTakerConfirmation), lte(orders.updatedAt, timeoutThreshold))),
        db.select().from(loans).where(and(eq(loans.status, LoanStatus.WaitingTakerConfirmation), lte(loans.updatedAt, timeoutThreshold))),
        db.select().from(orders).where(and(eq(orders.status, OrderStatus.WaitingMakerConfirmation), lte(orders.updatedAt, timeoutThreshold))),
        db.select().from(loans).where(and(eq(loans.status, LoanStatus.WaitingMakerConfirmation), lte(loans.updatedAt, timeoutThreshold))),
        db.select().from(orders).where(and(eq(orders.status, OrderStatus.WaitingEscrow), lte(orders.updatedAt, escrowThreshold))),
        db.select().from(loans).where(and(eq(loans.status, LoanStatus.WaitingCollateral), lte(loans.updatedAt, escrowThreshold)))
      ]);

      const pendingWrappers = [
        ...pendingOrders.map((o) => ({
          id: o.id,
          creatorId: o.creatorId,
          channelId: PUBLIC_CHANNEL_ID,
          msgId: o.channelMessageId,
          isLoan: false,
        })),
        ...pendingLoans.map((l) => ({
          id: l.id,
          creatorId: l.creatorId,
          channelId: LOANS_CHANNEL_ID,
          msgId: l.channelMessageId,
          isLoan: true,
        })),
      ];

      // Publicaciones sin ser tomadas
      for (const item of pendingWrappers) {
        const didCancel = item.isLoan
          ? await tryTransitionLoanStatus(
              item.id,
              [LoanStatus.Pending],
              LoanStatus.Cancelled,
            )
          : await tryTransitionOrderStatus(
              item.id,
              [OrderStatus.Pending],
              OrderStatus.Cancelled,
            );

        if (!didCancel) continue;

        if (item.msgId && item.channelId) {
          await bot.telegram
            .deleteMessage(item.channelId, item.msgId)
            .catch(() => {});
        }
        await safeNotify(bot, item.creatorId, (dict) =>
          dict.orderExpiredCancelled(item.id),
        );
      }

      const takerWrappers = [
        ...takerOrders.map((o) => ({
          id: o.id,
          takerId: o.takerId,
          isLoan: false,
        })),
        ...takerLoans.map((l) => ({
          id: l.id,
          takerId: l.takerId,
          isLoan: true,
        })),
      ];

      // Taker no responde a tiempo
      for (const item of takerWrappers) {
        const republished = item.isLoan
          ? await republishLoanSilently(bot as any, item.id)
          : await republishOrderSilently(bot, item.id);

        if (republished && item.takerId) {
          await safeNotify(bot, item.takerId, (dict) =>
            dict.takerTimeoutNotifyTaker(item.id),
          );
        }
      }

      // Maker no responde a tiempo
      const makerWrappers = [
        ...makerOrders.map((o) => ({
          id: o.id,
          creatorId: o.creatorId,
          takerId: o.takerId,
          isLoan: false,
        })),
        ...makerLoans.map((l) => ({
          id: l.id,
          creatorId: l.creatorId,
          takerId: l.takerId,
          isLoan: true,
        })),
      ];

      for (const item of makerWrappers) {
        const didCancel = item.isLoan
          ? await tryTransitionLoanStatus(
              item.id,
              [LoanStatus.WaitingMakerConfirmation],
              LoanStatus.Cancelled,
            )
          : await tryTransitionOrderStatus(
              item.id,
              [OrderStatus.WaitingMakerConfirmation],
              OrderStatus.Cancelled,
            );

        if (!didCancel) continue;

        await safeNotify(bot, item.creatorId, (dict) =>
          dict.makerTimeoutNotifyMaker(item.id),
        );
        if (item.takerId) {
          await safeNotify(bot, item.takerId, (dict) =>
            dict.makerTimeoutNotifyTaker(item.id),
          );
        }
      }

      const escrowWrappers = [
        ...escrowOrders.map((o) => ({
          id: o.id,
          address: o.escrowAddress,
          isCreatorFunder: o.type === "SELL",
          creatorId: o.creatorId,
          takerId: o.takerId,
          funderId: getParties(o).sellerId,
          waiterId: getParties(o).buyerId,
          isLoan: false,
        })),
        ...escrowLoans.map((l) => ({
          id: l.id,
          address: l.escrowAddress,
          isCreatorFunder: l.type === "BORROW",
          creatorId: l.creatorId,
          takerId: l.takerId,
          funderId: getLoanParties(l).borrowerId,
          waiterId: getLoanParties(l).lenderId,
          isLoan: true,
        })),
      ];

      // Fondeo de escrow sin completar (1 hora)
      for (const item of escrowWrappers) {
        if (!item.address) continue;
        const funding = await checkEscrowFunding(item.address);

        if (funding && funding.totalFundedSats > 0) {
          const didTransition = item.isLoan
            ? await tryTransitionLoanStatus(
                item.id,
                [LoanStatus.WaitingCollateral],
                LoanStatus.Refundable,
              )
            : await tryTransitionOrderStatus(
                item.id,
                [OrderStatus.WaitingEscrow],
                OrderStatus.Refundable,
              );

          if (didTransition) {
            await safeNotify(
              bot,
              item.funderId!,
              (dict) => dict.fundingExpired,
            );
            await safeNotify(
              bot,
              item.waiterId!,
              (dict) => dict.orderCancelled,
            );
          }
        } else {
          // Si no hay fondos
          if (item.isCreatorFunder) {
            // El Funder es el creador, por lo tanto, toda la oferta se cancela
            const didCancel = item.isLoan
              ? await tryTransitionLoanStatus(
                  item.id,
                  [LoanStatus.WaitingCollateral],
                  LoanStatus.Cancelled,
                )
              : await tryTransitionOrderStatus(
                  item.id,
                  [OrderStatus.WaitingEscrow],
                  OrderStatus.Cancelled,
                );

            if (didCancel) {
              await safeNotify(bot, item.creatorId, (dict) =>
                dict.makerTimeoutNotifyMaker(item.id),
              );
              if (item.takerId)
                await safeNotify(bot, item.takerId, (dict) =>
                  dict.makerTimeoutNotifyTaker(item.id),
                );
            }
          } else {
            // El Funder es el Taker, por lo tanto, el Taker falló y se republica la oferta del creador original
            const takerIdToNotify = item.takerId;
            const republished = item.isLoan
              ? await republishLoanSilently(bot as any, item.id)
              : await republishOrderSilently(bot, item.id);

            if (republished) {
              await safeNotify(bot, item.creatorId, (dict) =>
                dict.sellerDidNotFund(item.id),
              );
              if (takerIdToNotify) {
                await safeNotify(bot, takerIdToNotify, (dict) =>
                  dict.takerTimeoutNotifyTaker(item.id),
                );
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Error en monitor de timeouts:", err);
    } finally {
      isCheckingTimeouts = false;
    }
  }, 60000);
}
