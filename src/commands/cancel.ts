import {
  getOrder,
  getUserOrders,
  tryTransitionOrderStatus,
} from "../db/orders.js";
import { notifyUser } from "../utils/telegram.js";
import type { CallbackContext, CommandContext } from "../types.js";
import { handleOrderCancelledRepublish } from "../handlers/orderHandler.js";
import { OrderStatus, SettlementMethodType, TERMINAL_STATUSES } from "../shared/constants.js";
import { buildOrderSelectKeyboard } from "../shared/keyboards.js";
import { checkEscrowFunding } from "../core/bitcoin/transactions.js";
import { getParties } from "../utils/order.js";
import { getSellerDepositSats } from "../config/fees.js";
import { removeOrderFromChannel } from "../services/orderPublisher.js";
import { cancelHoldInvoiceForOrder, mapLightningSettlementError } from "../core/lightning/settlement.js";


export async function cancelCommand(ctx: CommandContext) {
  const userId = ctx.from.id;
  const dict = ctx.dict;

  const args = ctx.message.text.split(" ");
  if (args.length < 2) {
    let userOrders = await getUserOrders(userId);
    if (userOrders.length === 0) return ctx.reply(dict.noOrdersFound);
    await ctx.reply(dict.selectOrderToCancel, {
      ...buildOrderSelectKeyboard(userOrders, "cancelCommand"),
    });
    return;
  }

  const orderId = args[1] as string;
  return await handleOrderCancelFromCommand(ctx, orderId);
}

export async function handleOrderCancelFromCommand(
  ctx: CommandContext | CallbackContext,
  orderId: string,
) {
  const userId = ctx.from.id;
  const dict = ctx.dict;
  const order = await getOrder(orderId);

  if (!order) return ctx.reply(dict.orderNotFound);

  if (TERMINAL_STATUSES.includes(order.status as any)) {
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

    await removeOrderFromChannel(ctx.telegram, order.channelMessageId);

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
          const expectedSats = getSellerDepositSats(order.amountSats);

          if (funding.totalFundedSats < expectedSats) {
            const didCancel = await tryTransitionOrderStatus(
              orderId,
              [OrderStatus.WaitingEscrow],
              OrderStatus.Refundable,
            );
            if (!didCancel) return ctx.reply(dict.cancelNotAllowed);

            if (counterpartyId) {
              await notifyUser(ctx, counterpartyId, (d) =>
                d.counterpartyCanceledDeleted(order.id),
              );
            }
            return ctx.reply(dict.partialDepositCancelled);
          } else {
            return ctx.reply(dict.cancelUnconfirmed);
          }
        }
      }

      if (order.settlementMethod === SettlementMethodType.Lightning) {
        const holdCancelResult = await cancelHoldInvoiceForOrder(orderId);
        if (!holdCancelResult.ok) {
          return ctx.reply(
            mapLightningSettlementError(dict, holdCancelResult.reason),
            { parse_mode: "Markdown" },
          );
        }
      }

      const didCancel = await tryTransitionOrderStatus(
        orderId,
        [OrderStatus.WaitingEscrow],
        OrderStatus.Cancelled,
      );
      if (!didCancel) {
        // El listener onCanceled pudo haberla cancelado ya.
        const fresh = await getOrder(orderId);
        if (fresh?.status !== OrderStatus.Cancelled)
          return ctx.reply(dict.cancelNotAllowed);
        return;
      }

      if (counterpartyId) {
        await notifyUser(ctx, counterpartyId, (d) =>
          d.counterpartyCanceledDeleted(order.id),
        );
      }

      await ctx.reply(dict.orderCancelled);
      return;
    }

    case OrderStatus.WaitingTakerConfirmation:
    case OrderStatus.WaitingMakerConfirmation: {
      const isOriginalCreator = userId === order.creatorId;

      if (isOriginalCreator) {
        // El creador retira su propia oferta: cancelación terminal, sin republicar.
        const didCancel = await tryTransitionOrderStatus(
          orderId,
          [order.status],
          OrderStatus.Cancelled,
        );
        if (!didCancel) return ctx.reply(dict.cancelNotAllowed);

        if (counterpartyId) {
          await notifyUser(ctx, counterpartyId, (d) =>
            d.counterpartyCanceledDeleted(order.id),
          );
        }
        return ctx.reply(dict.orderCancelled);
      }

      // El taker se retira: la oferta del creador sigue viva, se republica.
      // handleOrderCancelledRepublish hace su propio UPDATE; usamos el status
      // actual ya validado arriba (no terminal) como única vía de entrada.
      if (counterpartyId) {
        await notifyUser(ctx, counterpartyId, (d) =>
          d.matchCancelledRepublished(order.id),
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
        await notifyUser(ctx, counterpartyId, (d) =>
          d.cancelNotifiedCounterparty(order.id),
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
        await notifyUser(
          ctx,
          requesterId,
          (d) =>
            requesterId === sellerId
              ? d.cancelAcceptedSeller(order.id)
              : d.cancelAccepted(order.id),
        );
      }
      return;
    }

    default:
      return ctx.reply(dict.cancelNotAllowed);
  }
}
