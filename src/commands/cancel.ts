import {
  getOrder,
  getUserOrders,
  tryTransitionOrderStatus,
} from "../db/orders.js";
import { getUser } from "../db/users.js";
import { getUserDict } from "../locales/index.js";
import type { CallbackContext, CommandContext, LoanRecord } from "../types.js";
import { handleOrderCancelledRepublish } from "../handlers/orderHandler.js";
import {
  isTerminalStatus,
  LoanStatus,
  OrderStatus,
  type ContractStatus,
} from "../shared/constants.js";
import { buildOrderSelectKeyboard } from "../shared/keyboards.js";
import { checkEscrowFunding } from "../core/bitcoin/transactions.js";
import { getLoanParties, getParties } from "../utils/parties.js";
import { getBotFeePercent } from "../config/fees.js";
import { getLoan, getUserLoans, tryTransitionLoanStatus } from "../db/loans.js";
import { republishLoanSilently } from "../handlers/loanHandler.js";
import { getContract } from "../db/contracts.js";

const PUBLIC_CHANNEL_ID = process.env.PUBLIC_CHANNEL_ID!;
const LOAN_CHANNEL_ID = process.env.LOAN_CHANNEL_ID!;

export async function cancelCommand(ctx: CommandContext) {
  const userId = ctx.from.id;
  const dict = ctx.dict;

  const args = ctx.message.text.split(" ");
  if (args.length < 2) {
    const userOrders = await getUserOrders(userId);
    const userLoans = await getUserLoans(userId);
    const combined = [...userOrders, ...userLoans];

    if (combined.length === 0) return ctx.reply(dict.noOrdersFound);

    await ctx.reply(dict.selectOrderToCancel, {
      ...buildOrderSelectKeyboard(combined, "cancelCommand"),
    });
    return;
  }

  const id = args[1] as string;
  return await routeCancel(ctx, id);
}

export async function routeCancel(
  ctx: CommandContext | CallbackContext,
  id: string,
) {
  const contract = await getContract(id);

  if (!contract) return ctx.reply(ctx.dict.orderNotFound);
  return contract.isLoan
    ? await handleLoanCancelFromCommand(ctx, contract.data as LoanRecord)
    : await handleOrderCancelFromCommand(ctx, contract.data.id);
}

export async function handleLoanCancelFromCommand(
  ctx: CommandContext | CallbackContext,
  loanOrId: string | LoanRecord,
) {
  const userId = ctx.from!.id;
  const dict = ctx.dict;

  const loan =
    typeof loanOrId === "string" ? await getLoan(loanOrId) : loanOrId;
  if (!loan) return ctx.reply(dict.orderNotFound);

  const TERMINAL_LOAN_STATUSES = [
    LoanStatus.Completed,
    LoanStatus.Cancelled,
    LoanStatus.Refunded,
    LoanStatus.Liquidated,
    LoanStatus.Liquidatable,
    LoanStatus.Dispute,
  ];
  if (TERMINAL_LOAN_STATUSES.includes(loan.status as any)) {
    return ctx.reply(dict.cancelNotAllowed);
  }

  const { borrowerId } = getLoanParties(loan);
  const counterpartyId =
    userId === loan.creatorId ? loan.takerId : loan.creatorId;

  switch (loan.status) {
    case LoanStatus.Pending: {
      if (loan.creatorId !== userId) return ctx.reply(dict.unauthorizedAccess);

      const didCancel = await tryTransitionLoanStatus(
        loan.id,
        [LoanStatus.Pending],
        LoanStatus.Cancelled,
      );
      if (!didCancel) return ctx.reply(dict.cancelNotAllowed);

      if (loan.channelMessageId) {
        try {
          await ctx.telegram.deleteMessage(
            LOAN_CHANNEL_ID,
            loan.channelMessageId,
          );
        } catch (e) {}
      }
      return ctx.reply(dict.orderCancelled);
    }

    case LoanStatus.WaitingTakerConfirmation:
    case LoanStatus.WaitingMakerConfirmation: {
      const isOriginalCreator = userId === loan.creatorId;

      if (isOriginalCreator) {
        const didCancel = await tryTransitionLoanStatus(
          loan.id,
          [loan.status],
          LoanStatus.Cancelled,
        );
        if (!didCancel) return ctx.reply(dict.cancelNotAllowed);

        if (counterpartyId) {
          const cDict = getUserDict((await getUser(counterpartyId))?.language);
          await ctx.telegram.sendMessage(
            counterpartyId,
            cDict.counterpartyCanceledDeleted(loan.id),
            { parse_mode: "Markdown" },
          );
        }
        return ctx.reply(dict.orderCancelled);
      } else {
        if (counterpartyId) {
          const cDict = getUserDict((await getUser(counterpartyId))?.language);
          await ctx.telegram.sendMessage(
            counterpartyId,
            cDict.matchCancelledRepublished(loan.id),
            { parse_mode: "Markdown" },
          );
        }

        ctx.callbackQuery
          ? await ctx.editMessageText(dict.orderCancelled)
          : await ctx.reply(dict.orderCancelled);

        republishLoanSilently(ctx, loan.id);
        return;
      }
    }

    case LoanStatus.WaitingCollateral: {
      if (userId !== borrowerId) return ctx.reply(dict.loanCancelOnlyBorrower);

      const TIME_LOCK_MS = 10 * 60 * 1000;
      if (Date.now() - loan.updatedAt! < TIME_LOCK_MS)
        return ctx.reply(dict.cancelAddressWait);

      if (loan.escrowAddress) {
        const funding = await checkEscrowFunding(loan.escrowAddress);
        if (funding && funding.totalFundedSats > 0) {
          if (funding.totalFundedSats < loan.collateralSats!) {
            const didCancel = await tryTransitionLoanStatus(
              loan.id,
              [LoanStatus.WaitingCollateral],
              LoanStatus.Refundable,
            );
            if (!didCancel) return ctx.reply(dict.cancelNotAllowed);

            if (counterpartyId) {
              const cDict = getUserDict(
                (await getUser(counterpartyId))?.language,
              );
              await ctx.telegram.sendMessage(
                counterpartyId,
                cDict.counterpartyCanceledDeleted(loan.id),
                { parse_mode: "Markdown" },
              );
            }
            return ctx.reply(dict.partialDepositCancelled);
          } else {
            return ctx.reply(dict.cancelUnconfirmed);
          }
        }
      }

      const didCancel = await tryTransitionLoanStatus(
        loan.id,
        [LoanStatus.WaitingCollateral],
        LoanStatus.Cancelled,
      );
      if (!didCancel) return ctx.reply(dict.cancelNotAllowed);

      if (counterpartyId) {
        const cDict = getUserDict((await getUser(counterpartyId))?.language);
        await ctx.telegram.sendMessage(
          counterpartyId,
          cDict.counterpartyCanceledDeleted(loan.id),
          { parse_mode: "Markdown" },
        );
      }
      return ctx.reply(dict.orderCancelled);
    }

    case LoanStatus.CollateralUnconfirmed:
      return ctx.reply(dict.cancelUnconfirmed);

    case LoanStatus.WaitingDisbursement: {
      const didRequest = await tryTransitionLoanStatus(
        loan.id,
        [LoanStatus.WaitingDisbursement],
        LoanStatus.CancelRequested,
        { cancelRequestedBy: userId },
      );
      if (!didRequest) return ctx.reply(dict.cancelNotAllowed);

      await ctx.reply(dict.cancelRequestSuccess);

      if (counterpartyId) {
        const cDict = getUserDict((await getUser(counterpartyId))?.language);
        await ctx.telegram.sendMessage(
          counterpartyId,
          cDict.cancelNotifiedCounterparty(loan.id),
          { parse_mode: "Markdown" },
        );
      }
      return;
    }

    case LoanStatus.CancelRequested: {
      const requesterId = loan.cancelRequestedBy;
      if (requesterId === userId) return ctx.reply(dict.cancelAlreadyRequested);

      const didConfirm = await tryTransitionLoanStatus(
        loan.id,
        [LoanStatus.CancelRequested],
        LoanStatus.Refundable,
        { cancelRequestedBy: null },
      );
      if (!didConfirm) return ctx.reply(dict.cancelNotAllowed);

      await ctx.reply(
        userId === borrowerId
          ? dict.cancelAcceptedSeller(loan.id)
          : dict.cancelAccepted(loan.id),
        { parse_mode: "Markdown" },
      );

      if (requesterId) {
        const rDict = getUserDict((await getUser(requesterId))?.language);
        await ctx.telegram.sendMessage(
          requesterId,
          requesterId === borrowerId
            ? rDict.cancelAcceptedSeller(loan.id)
            : rDict.cancelAccepted(loan.id),
          { parse_mode: "Markdown" },
        );
      }
      return;
    }

    case LoanStatus.DisbursementSent:
    case LoanStatus.Active:
      return ctx.reply(dict.cancelLoanForbidden, { parse_mode: "Markdown" });

    default:
      return ctx.reply(dict.cancelNotAllowed);
  }
}

export async function handleOrderCancelFromCommand(
  ctx: CommandContext | CallbackContext,
  orderId: string,
) {
  const userId = ctx.from.id;
  const dict = ctx.dict;
  const order = await getOrder(orderId);

  if (!order) return ctx.reply(dict.orderNotFound);

  if (isTerminalStatus(order.status as ContractStatus)) {
    return ctx.reply(dict.cancelNotAllowed);
  }

  const { buyerId, sellerId } = getParties(order);

  if (order.status === OrderStatus.Pending) {
    if (order.creatorId !== userId) return ctx.reply(dict.unauthorizedAccess);

    const didCancel = await tryTransitionOrderStatus(
      orderId,
      [OrderStatus.Pending],
      OrderStatus.Cancelled,
    );
    if (!didCancel) return ctx.reply(dict.cancelNotAllowed); // alguien más ya la tomó justo ahora

    if (order.channelMessageId) {
      try {
        await ctx.telegram.deleteMessage(
          PUBLIC_CHANNEL_ID,
          order.channelMessageId,
        );
      } catch (e) {
        console.error(e);
      }
    }

    return ctx.reply(dict.orderCancelled);
  }

  if (userId !== sellerId && userId !== buyerId) {
    return ctx.reply(dict.unauthorizedAccess);
  }

  const counterpartyId = userId === sellerId ? buyerId : sellerId;

  switch (order.status) {
    case OrderStatus.WaitingEscrow: {
      if (userId !== sellerId) return ctx.reply(dict.cancelOnlySeller);
      const TIME_LOCK_MS = 10 * 60 * 1000;
      if (Date.now() - order.updatedAt < TIME_LOCK_MS) {
        return ctx.reply(dict.cancelAddressWait);
      }
      if (order.escrowAddress) {
        const funding = await checkEscrowFunding(order.escrowAddress);
        if (funding && funding.totalFundedSats > 0) {
          const botFeePercent = getBotFeePercent(order.amountSats);
          const sellerFeeSats = Math.floor(
            order.amountSats * (botFeePercent / 2 / 100),
          );
          const expectedSats = order.amountSats + sellerFeeSats;

          if (funding.totalFundedSats < expectedSats) {
            const didCancel = await tryTransitionOrderStatus(
              orderId,
              [OrderStatus.WaitingEscrow],
              OrderStatus.Refundable,
            );
            if (!didCancel) return ctx.reply(dict.cancelNotAllowed);

            if (counterpartyId) {
              const counterparty = await getUser(counterpartyId);
              const cDict = getUserDict(counterparty?.language);
              await ctx.telegram.sendMessage(
                counterpartyId,
                cDict.counterpartyCanceledDeleted(order.id),
                { parse_mode: "Markdown" },
              );
            }
            return ctx.reply(dict.partialDepositCancelled);
          } else {
            return ctx.reply(dict.cancelUnconfirmed);
          }
        }
      }

      const didCancel = await tryTransitionOrderStatus(
        orderId,
        [OrderStatus.WaitingEscrow],
        OrderStatus.Cancelled,
      );
      if (!didCancel) return ctx.reply(dict.cancelNotAllowed);

      if (counterpartyId) {
        const counterparty = await getUser(counterpartyId);
        const cDict = getUserDict(counterparty?.language);
        await ctx.telegram.sendMessage(
          counterpartyId,
          cDict.counterpartyCanceledDeleted(order.id),
          { parse_mode: "Markdown" },
        );
      }

      await ctx.reply(dict.orderCancelled);
      return;
    }

    case OrderStatus.WaitingTakerConfirmation:
    case OrderStatus.WaitingMakerConfirmation: {
      const isOriginalCreator = userId === order.creatorId;

      if (isOriginalCreator) {
        const didCancel = await tryTransitionOrderStatus(
          orderId,
          [order.status],
          OrderStatus.Cancelled,
        );
        if (!didCancel) return ctx.reply(dict.cancelNotAllowed);

        if (counterpartyId) {
          const counterparty = await getUser(counterpartyId);
          const cDict = getUserDict(counterparty?.language);
          await ctx.telegram.sendMessage(
            counterpartyId,
            cDict.counterpartyCanceledDeleted(order.id),
            { parse_mode: "Markdown" },
          );
        }
        return ctx.reply(dict.orderCancelled);
      }

      // El taker se retira: la oferta del creador sigue viva, se republica.
      // handleOrderCancelledRepublish hace su propio UPDATE; usamos el status
      // actual ya validado arriba (no terminal) como única vía de entrada.
      if (counterpartyId) {
        const counterparty = await getUser(counterpartyId);
        const cDict = getUserDict(counterparty?.language);
        await ctx.telegram.sendMessage(
          counterpartyId,
          cDict.matchCancelledRepublished(order.id),
          { parse_mode: "Markdown" },
        );
      }
      return handleOrderCancelledRepublish(ctx, orderId);
    }

    case OrderStatus.Unconfirmed:
      return ctx.reply(dict.cancelUnconfirmed);

    case OrderStatus.Active:
    case OrderStatus.FiatSent: {
      const didRequest = await tryTransitionOrderStatus(
        orderId,
        [order.status],
        OrderStatus.CancelRequested,
        { cancelRequestedBy: userId },
      );
      if (!didRequest) return ctx.reply(dict.cancelNotAllowed);

      await ctx.reply(dict.cancelRequestSuccess);

      if (counterpartyId) {
        const counterparty = await getUser(counterpartyId);
        const cDict = getUserDict(counterparty?.language);
        await ctx.telegram.sendMessage(
          counterpartyId,
          cDict.cancelNotifiedCounterparty(order.id),
          { parse_mode: "Markdown" },
        );
      }
      return;
    }

    // Ya hay una solicitud pendiente: si la contraparte confirma, se habilita el reembolso.
    case OrderStatus.CancelRequested: {
      const requesterId = order.cancelRequestedBy;

      if (requesterId === userId) {
        return ctx.reply(dict.cancelAlreadyRequested);
      }

      const didConfirm = await tryTransitionOrderStatus(
        orderId,
        [OrderStatus.CancelRequested],
        OrderStatus.Refundable,
        { cancelRequestedBy: null },
      );
      if (!didConfirm) return ctx.reply(dict.cancelNotAllowed);

      await ctx.reply(
        userId === sellerId
          ? dict.cancelAcceptedSeller(order.id)
          : dict.cancelAccepted(order.id),
        { parse_mode: "Markdown" },
      );

      if (requesterId) {
        const requester = await getUser(requesterId);
        const rDict = getUserDict(requester?.language);
        await ctx.telegram.sendMessage(
          requesterId,
          requesterId === sellerId
            ? rDict.cancelAcceptedSeller(order.id)
            : rDict.cancelAccepted(order.id),
          { parse_mode: "Markdown" },
        );
      }
      return;
    }

    default:
      return ctx.reply(dict.cancelNotAllowed);
  }
}
