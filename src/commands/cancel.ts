import {
  getOrder,
  getUserOrders,
  tryTransitionOrderStatus,
} from "../db/orders.js";
import { getUser } from "../db/users.js";
import { dictionaries, type Language } from "../locales/index.js";
import type { CallbackContext, CommandContext, OrderType } from "../types.js";
import { handleOrderCancelledRepublish } from "../handlers/orderHandler.js";
import { Markup } from "telegraf";
import { TERMINAL_STATUSES } from "../shared/constants.js";

const PUBLIC_CHANNEL_ID = process.env.PUBLIC_CHANNEL_ID!;

export async function cancelCommand(ctx: CommandContext) {
  const userId = ctx.from.id;
  const dict = ctx.dict;

  const args = ctx.message.text.split(" ");
  if (args.length < 2) {
    let userOrders = await getUserOrders(userId);
    if (userOrders.length === 0) return ctx.reply(dict.noOrdersFound);
    const groupBy = (items: any, size: number) =>
      Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
        items.slice(index * size, (index + 1) * size),
      );

    const buttons = userOrders.map((o) =>
      Markup.button.callback(
        `${o.id.slice(0, 2)}..${o.id.slice(-2)} - ${o.type} - ${o.fiatCode}`,
        `cancelCommand_${o.id}`,
      ),
    );

    const rows = groupBy(buttons, 3);
    await ctx.reply(dict.selectOrderToCancel , {
      ...Markup.inlineKeyboard(rows)
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

  if (TERMINAL_STATUSES.includes(order.status)) {
    return ctx.reply(dict.cancelNotAllowed);
  }

  const isCreatorSelling = order.type === "SELL";
  const sellerId = isCreatorSelling ? order.creatorId : order.takerId;
  const buyerId = isCreatorSelling ? order.takerId : order.creatorId;

  if (order.status === "PENDING") {
    if (order.creatorId !== userId) return ctx.reply(dict.unauthorizedAccess);

    const didCancel = await tryTransitionOrderStatus(
      orderId,
      ["PENDING"],
      "CANCELLED",
    );
    if (!didCancel) return ctx.reply(dict.cancelNotAllowed); // alguien más ya la tomó justo ahora

    if (order.channelMessageId) {
      try {
        await ctx.telegram.deleteMessage(
          PUBLIC_CHANNEL_ID,
          order.channelMessageId,
        );
      } catch (e) {}
    }

    return ctx.reply(dict.orderCancelled);
  }

  if (userId !== sellerId && userId !== buyerId) {
    return ctx.reply(dict.unauthorizedAccess);
  }

  const counterpartyId = userId === sellerId ? buyerId : sellerId;

  switch (order.status) {
    case "WAITING_ESCROW": {
      if (userId !== sellerId) return ctx.reply(dict.cancelOnlySeller);

      const didCancel = await tryTransitionOrderStatus(
        orderId,
        ["WAITING_ESCROW"],
        "CANCELLED",
      );
      if (!didCancel) return ctx.reply(dict.cancelNotAllowed);

      if (counterpartyId) {
        const counterparty = await getUser(counterpartyId);
        const cDict =
          dictionaries[(counterparty?.language as Language) || "es"];
        await ctx.telegram.sendMessage(
          counterpartyId,
          cDict.counterpartyCanceledDeleted(order.id),
          { parse_mode: "Markdown" },
        );
      }

      await ctx.reply(dict.orderCancelled);
      return;
    }

    case "WAITING_TAKER_CONFIRMATION":
    case "WAITING_MAKER_CONFIRMATION": {
      const isOriginalCreator = userId === order.creatorId;

      if (isOriginalCreator) {
        // El creador retira su propia oferta: cancelación terminal, sin republicar.
        const didCancel = await tryTransitionOrderStatus(
          orderId,
          [order.status],
          "CANCELLED",
        );
        if (!didCancel) return ctx.reply(dict.cancelNotAllowed);

        if (counterpartyId) {
          const counterparty = await getUser(counterpartyId);
          const cDict =
            dictionaries[(counterparty?.language as Language) || "es"];
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
        const cDict =
          dictionaries[(counterparty?.language as Language) || "es"];
        await ctx.telegram.sendMessage(
          counterpartyId,
          cDict.matchCancelledRepublished(order.id),
          { parse_mode: "Markdown" },
        );
      }
      return handleOrderCancelledRepublish(ctx, orderId);
    }

    case "UNCONFIRMED":
      return ctx.reply(dict.cancelUnconfirmed);

    case "ACTIVE":
    case "FIAT_SENT": {
      const didRequest = await tryTransitionOrderStatus(
        orderId,
        [order.status],
        "CANCEL_REQUESTED",
        { cancelRequestedBy: userId },
      );
      if (!didRequest) return ctx.reply(dict.cancelNotAllowed);

      await ctx.reply(dict.cancelRequestSuccess);

      if (counterpartyId) {
        const counterparty = await getUser(counterpartyId);
        const cDict =
          dictionaries[(counterparty?.language as Language) || "es"];
        await ctx.telegram.sendMessage(
          counterpartyId,
          cDict.cancelNotifiedCounterparty(order.id),
          { parse_mode: "Markdown" },
        );
      }
      return;
    }

    // Ya hay una solicitud pendiente: si la contraparte confirma, se habilita el reembolso.
    case "CANCEL_REQUESTED": {
      const requesterId = order.cancelRequestedBy;

      if (requesterId === userId) {
        return ctx.reply(dict.cancelAlreadyRequested);
      }

      const didConfirm = await tryTransitionOrderStatus(
        orderId,
        ["CANCEL_REQUESTED"],
        "REFUNDABLE",
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
        const rDict = dictionaries[(requester?.language as Language) || "es"];
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