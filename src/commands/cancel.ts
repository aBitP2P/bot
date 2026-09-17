import {
  getOrder,
  getUserOrders,
  tryTransitionOrderStatus,
} from "../db/orders.js";
import { getUser } from "../db/users.js";
import { getUserDict } from "../locales/index.js";
import type { CallbackContext, CommandContext } from "../types.js";
import { handleOrderCancelledRepublish } from "../handlers/orderHandler.js";
import { OrderStatus, TERMINAL_STATUSES } from "../shared/constants.js";
import { buildOrderSelectKeyboard } from "../shared/keyboards.js";
import { checkEscrowFunding } from "../core/bitcoin/transactions.js";
import { getParties } from "../utils/order.js";

const PUBLIC_CHANNEL_ID = process.env.PUBLIC_CHANNEL_ID!;

export async function cancelCommand(ctx: CommandContext) {
  const userId = ctx.from.id;
  const dict = ctx.dict;

  const args = ctx.message.text.split(" ");
  if (args.length < 2) {
    let userOrders = await getUserOrders(userId);
    if (userOrders.length === 0) return ctx.reply(dict.noOrdersFound);
    await ctx.reply(dict.selectOrderToCancel , {
      ...buildOrderSelectKeyboard(userOrders, "cancelCommand")
    });
    return;
  }

  const orderId = args[1] as string;
  return await handleOrderCancelFromCommand(ctx, orderId);
}

export async function handleOrderCancelFromCommand(ctx: CommandContext | CallbackContext, orderId: string) {
  const userId = ctx.from.id;
  const dict = ctx.dict;
  const order = await getOrder(orderId);

  if (!order) return ctx.reply(dict.orderNotFound);

  if (TERMINAL_STATUSES.includes(order.status as any)) {
    return ctx.reply(dict.cancelNotAllowed);
  }

  const { buyerId, sellerId } = getParties(order);

  if (order.status === OrderStatus.PENDING) {
    if (order.creatorId !== userId) return ctx.reply(dict.unauthorizedAccess);

    const didCancel = await tryTransitionOrderStatus(
      orderId,
      [OrderStatus.PENDING],
      OrderStatus.CANCELLED,
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
    case OrderStatus.WAITING_ESCROW: {
      if (userId !== sellerId) return ctx.reply(dict.cancelOnlySeller);

      if (order.escrowAddress) {
        const funding = await checkEscrowFunding(order.escrowAddress);
        if (funding && funding.totalFundedSats > 0) {
          return ctx.reply(dict.cancelUnconfirmed);
        }
      }

      const didCancel = await tryTransitionOrderStatus(
        orderId,
        [OrderStatus.WAITING_ESCROW],
        OrderStatus.CANCELLED,
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

    case OrderStatus.WAITING_TAKER_CONFIRMATION:
    case OrderStatus.WAITING_MAKER_CONFIRMATION: {
      const isOriginalCreator = userId === order.creatorId;

      if (isOriginalCreator) {
        // El creador retira su propia oferta: cancelación terminal, sin republicar.
        const didCancel = await tryTransitionOrderStatus(
          orderId,
          [order.status],
          OrderStatus.CANCELLED,
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

    case OrderStatus.UNCONFIRMED:
      return ctx.reply(dict.cancelUnconfirmed);

    case OrderStatus.ACTIVE:
    case OrderStatus.FIAT_SENT: {
      const didRequest = await tryTransitionOrderStatus(
        orderId,
        [order.status],
        OrderStatus.CANCEL_REQUESTED,
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
    case OrderStatus.CANCEL_REQUESTED: {
      const requesterId = order.cancelRequestedBy;

      if (requesterId === userId) {
        return ctx.reply(dict.cancelAlreadyRequested);
      }

      const didConfirm = await tryTransitionOrderStatus(
        orderId,
        [OrderStatus.CANCEL_REQUESTED],
        OrderStatus.REFUNDABLE,
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
        const rDict = getUserDict(requester?.language)
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