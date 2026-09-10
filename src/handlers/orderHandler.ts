import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { orders } from "../db/schema.js";
import {
  type BotContext,
  type CallbackContext,
  type CommandContext,
} from "../types.js";
import { getUser } from "../db/users.js";
import { type Language, dictionaries, t } from "../locales/index.js";
import { Markup } from "telegraf";
import { initializeEscrow } from "./escrowHandler.js";
import { getOrder, tryTransitionOrderStatus } from "../db/orders.js";
const PUBLIC_CHANNEL_ID = process.env.PUBLIC_CHANNEL_ID!;
export async function handleOrderCancelledRepublish(
  ctx: CallbackContext | CommandContext,
  orderId: string,
) {
  const didReset = await tryTransitionOrderStatus(
    orderId,
    ["WAITING_TAKER_CONFIRMATION", "WAITING_MAKER_CONFIRMATION"],
    "PENDING",
    {
      takerId: null,
      buyerAddress: null,
      fiatAmountLocked: null,
      cancelRequestedBy: null,
    },
  );

  if (!didReset) {
    return ctx.callbackQuery
      ? ctx.answerCbQuery(ctx.dict.cancelNotAllowed, { show_alert: true })
      : ctx.reply(ctx.dict.cancelNotAllowed);
  }

  ctx.callbackQuery
    ? await ctx.editMessageText(ctx.dict.orderCancelled)
    : await ctx.reply(ctx.dict.orderCancelled, { parse_mode: "Markdown" });

  const order = await getOrder(orderId);
  const orderCreator = (await getUser(order!.creatorId))!;
  const dict = dictionaries[(orderCreator.language as Language) || "es"];

  const sentChannelMsg = await ctx.telegram.sendMessage(
    PUBLIC_CHANNEL_ID,
    ctx.dict.channelOrder({
      action: order!.type === "SELL" ? dict.actionSell : dict.actionBuy,
      amountFiat: order!.amountFiat,
      fiat: order!.fiatCode,
      payDirection:
        order!.type === "SELL" ? dict.payDirectionSell : dict.payDirectionBuy,
      method: order!.paymentMethod,
      daysUsing: Math.floor((Date.now() - orderCreator.createdAt) / 86400000),
      hashtag: `#${order!.type}${order!.fiatCode}`,
      margin: order!.margin,
      rating: orderCreator.rating || 0,
      tradesCount: orderCreator.tradesCount || 0,
      id: order!.id,
    }),
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback(
            order!.type === "SELL" ? dict.btnBuyBitcoin : dict.btnSellBitcoin,
            `take_order_${orderId}`,
          ),
        ],
      ]),
    },
  );

  await db
    .update(orders)
    .set({ channelMessageId: sentChannelMsg.message_id })
    .where(eq(orders.id, orderId));
  return;
}

export async function handleTakeOrder(ctx: CallbackContext, orderId: string) {
  const takerId = ctx.from.id;
  if (!takerId) return;
  const user = ctx.user;
  const dict = ctx.dict;
  if (!user?.pubkey) {
    await ctx.telegram.sendMessage(takerId, dict.setYourPersonalPassword, {
      parse_mode: "Markdown",
    });
    return ctx.answerCbQuery();
  }
  const order = await getOrder(orderId);

  if (!order)
    return ctx.answerCbQuery(dict.orderNotFound, { show_alert: true });
  if (order.creatorId === takerId)
    return ctx.answerCbQuery(dict.cantTakeOwnOrder, { show_alert: true });

  // CAS: si dos usuarios tocan "Tomar Orden" casi simultáneamente sobre la
  // misma orden PENDING, solo uno de los dos UPDATE afecta realmente la fila;
  // el otro ve 0 cambios y se le informa que ya fue tomada, en vez de que su
  // takerId pise silenciosamente al primero.
  const didTake = await tryTransitionOrderStatus(
    orderId,
    ["PENDING"],
    "WAITING_TAKER_CONFIRMATION",
    { takerId },
  );
  if (!didTake) return ctx.answerCbQuery(dict.orderTaken, { show_alert: true });

  const typeText =
    order.type === "SELL"
      ? t(ctx.user.language as Language, "actionBuy")
      : t(ctx.user.language as Language, "actionSell");

  try {
    await ctx.deleteMessage();
  } catch (e) {}

  await ctx.telegram.sendMessage(
    takerId,
    dict.takerAskConfirm({
      type: typeText,
      fiat: order.fiatCode,
      amount: order.amountFiat,
      margin: order.margin,
      method: order.paymentMethod,
      id: order.id,
    }),
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback(dict.btnYes, `taker_yes_${order.id}`)],
        [Markup.button.callback(dict.btnNo, `taker_cancel_order_${order.id}`)],
      ]),
    },
  );
}

export async function handleTakerConfirm(ctx: BotContext, orderId: string) {
  const takerId = ctx.from?.id;
  const order = await getOrder(orderId);
  if (!order || !takerId) return;
  if (order.status !== "WAITING_TAKER_CONFIRMATION") return;
  if (order.takerId !== takerId) {
    return ctx.answerCbQuery(ctx.dict.unauthorizedAccess, { show_alert: true });
  }
  const dict =
    dictionaries[((await getUser(takerId))?.language as Language) || "es"];
  await ctx.editMessageReplyMarkup(undefined);

  if (order.amountFiat.includes("-")) {
    ctx.session.awaitingAmountForOrder = order.id;
    return ctx.reply(dict.promptExactAmount(order.amountFiat, order.fiatCode), {
      parse_mode: "Markdown",
    });
  }

  const exactAmount = parseFloat(order.amountFiat);
  await db
    .update(orders)
    .set({ fiatAmountLocked: exactAmount })
    .where(eq(orders.id, orderId));

  await proceedAfterTakerAmount(ctx, order);
}

export async function proceedAfterTakerAmount(ctx: BotContext, order: any) {
  const dict = ctx.dict;
  const isTakerBuyer = order.type === "SELL";

  if (isTakerBuyer) {
    ctx.session.awaitingAddressForOrder = order.id;
    await ctx.reply(dict.askBuyerAddress, { parse_mode: "Markdown" });
  } else {
    await db
      .update(orders)
      .set({ takerId: ctx.user.telegramId })
      .where(eq(orders.id, order.id));
    await ctx.reply(dict.waitMaker, { parse_mode: "Markdown" });
    await notifyMakerForConfirmation(ctx, order);
  }
}

export async function notifyMakerForConfirmation(
  ctx: BotContext,
  order: typeof orders.$inferSelect,
) {
  const taker = await getUser(order.takerId!);
  const dict =
    dictionaries[
      ((await getUser(order.creatorId))?.language as Language) || "es"
    ];

  const daysUsing = taker
    ? Math.floor((Date.now() - taker.createdAt) / 86400000)
    : 0;
  const typeText = order.type === "SELL" ? dict.sellType : dict.buyType; // Perspectiva del Maker

  await db
    .update(orders)
    .set({ status: "WAITING_MAKER_CONFIRMATION" })
    .where(eq(orders.id, order.id));

  const displayAmount = order.fiatAmountLocked
    ? order.fiatAmountLocked.toString()
    : order.amountFiat;

  await ctx.telegram.sendMessage(
    order.creatorId,
    dict.makerAskConfirm({
      type: typeText,
      fiat: order.fiatCode,
      amount: displayAmount,
      margin: order.margin,
      method: order.paymentMethod,
      trades: taker?.tradesCount || 0,
      days: daysUsing,
      rating: taker?.rating || 0,
      id: order.id,
    }),
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback(dict.btnYes, `maker_yes_${order.id}`)],
        [Markup.button.callback(dict.btnNo, `maker_deny_${order.id}`)],
      ]),
    },
  );
}

export async function handleMakerConfirm(
  ctx: CallbackContext,
  orderId: string,
) {
  const makerId = ctx.from.id;
  const order = await getOrder(orderId);
  if (!order || !makerId) return;
  if (order.status !== "WAITING_MAKER_CONFIRMATION") return;
  if (order.creatorId !== makerId) {
    return ctx.answerCbQuery(ctx.dict.unauthorizedAccess, { show_alert: true });
  }

  const dict = ctx.dict;
  await ctx.editMessageReplyMarkup(undefined);

  const isMakerBuyer = order.type === "BUY";

  if (isMakerBuyer) {
    ctx.session.awaitingAddressForOrder = orderId;
    await ctx.reply(dict.askBuyerAddress, { parse_mode: "Markdown" });
  } else {
    await ctx.telegram.sendMessage(
      order.takerId!,
      dict.acceptedNowWaitingEscrow,
      { parse_mode: "Markdown" },
    );
    await db
      .update(orders)
      .set({ status: "WAITING_ESCROW" })
      .where(eq(orders.id, orderId));

    await initializeEscrow(ctx, orderId);
  }
}
