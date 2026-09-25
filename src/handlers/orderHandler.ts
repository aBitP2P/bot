import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { orders } from "../db/schema.js";
import {
  type BotContext,
  type CallbackContext,
  type CommandContext,
  type OrderRecord,
} from "../types.js";
import { getUser } from "../db/users.js";
import { type Language, getUserDict, t } from "../locales/index.js";
import { Markup, Telegraf } from "telegraf";
import { initializeEscrow } from "./escrowHandler.js";
import {
  getOrder,
  getUserOrders,
  tryTransitionOrderStatus,
} from "../db/orders.js";
import {
  buildMakerConfirmKeyboard,
  buildTakerConfirmKeyboard,
} from "../shared/keyboards.js";
import { getRateInfoFor } from "../utils/price.js";
import { escapeMarkdown } from "../utils/format.js";
import { safeDeleteMsg } from "../utils/telegram.js";
import { OrderStatus } from "../shared/constants.js";
import { getBotFeePercent } from "../config/fees.js";
const PUBLIC_CHANNEL_ID = process.env.PUBLIC_CHANNEL_ID!;

export async function republishOrderSilently(
  bot: Telegraf<BotContext>,
  orderId: string,
) {
  const didReset = await tryTransitionOrderStatus(
    orderId,
    [OrderStatus.WaitingTakerConfirmation],
    OrderStatus.Pending,
    {
      takerId: null,
      buyerAddress: null,
      fiatAmountLocked: null,
      cancelRequestedBy: null,
      createdAt: Date.now(), // Reinicia las 24h
    },
  );

  if (!didReset) return false;

  const order = await getOrder(orderId);
  if (!order) return false;

  const orderCreator = await getUser(order.creatorId);
  if (!orderCreator) return false;

  const dict = getUserDict(orderCreator.language);

  const sentChannelMsg = await bot.telegram.sendMessage(
    PUBLIC_CHANNEL_ID,
    dict.channelOrder({
      action: order.type === "SELL" ? dict.actionSell : dict.actionBuy,
      amountFiat: order.amountFiat,
      fiat: order.fiatCode,
      payDirection:
        order.type === "SELL" ? dict.payDirectionSell : dict.payDirectionBuy,
      method: escapeMarkdown(order.paymentMethod),
      daysUsing: Math.floor((Date.now() - orderCreator.createdAt) / 86400000),
      hashtag: `#${order.type}${order.fiatCode}`,
      margin: order.margin,
      rating: orderCreator.rating || 0,
      ratingCount: orderCreator.ratingCount,
      tradesCount: orderCreator.tradesCount || 0,
      id: order.id,
    }),
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback(
            order.type === "SELL" ? dict.btnBuyBitcoin : dict.btnSellBitcoin,
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

  return true;
}

export async function handleOrderCancelledRepublish(
  ctx: CallbackContext | CommandContext | BotContext,
  orderId: string,
  customMessage?: string,
) {
  const didReset = await tryTransitionOrderStatus(
    orderId,
    [
      OrderStatus.WaitingTakerConfirmation,
      OrderStatus.WaitingMakerConfirmation,
    ],
    OrderStatus.Pending,
    {
      takerId: null,
      buyerAddress: null,
      fiatAmountLocked: null,
      cancelRequestedBy: null,
      createdAt: Date.now(),
    },
  );

  if (!didReset) {
    return ctx.callbackQuery
      ? ctx.answerCbQuery(ctx.dict.cancelNotAllowed, { show_alert: true })
      : ctx.reply(ctx.dict.cancelNotAllowed);
  }

  const msg = customMessage || ctx.dict.orderCancelled;

  ctx.callbackQuery
    ? await ctx.editMessageText(msg)
    : await ctx.reply(msg, { parse_mode: "Markdown" });

  const order = await getOrder(orderId);
  const orderCreator = (await getUser(order!.creatorId))!;
  const dict = getUserDict(orderCreator.language);

  const sentChannelMsg = await ctx.telegram.sendMessage(
    PUBLIC_CHANNEL_ID,
    dict.channelOrder({
      action: order!.type === "SELL" ? dict.actionSell : dict.actionBuy,
      amountFiat: order!.amountFiat,
      fiat: order!.fiatCode,
      payDirection:
        order!.type === "SELL" ? dict.payDirectionSell : dict.payDirectionBuy,
      method: escapeMarkdown(order!.paymentMethod),
      daysUsing: Math.floor((Date.now() - orderCreator.createdAt) / 86400000),
      hashtag: `#${order!.type}${order!.fiatCode}`,
      margin: order!.margin,
      rating: orderCreator.rating || 0,
      ratingCount: orderCreator.ratingCount,
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

  const activeOrders = await getUserOrders(takerId);
  const isBusy = activeOrders.some((o) => o.takerId === takerId);
  if (isBusy)
    return ctx.answerCbQuery(dict.alreadyHaveActiveOrder, { show_alert: true });

  // CAS: si dos usuarios tocan "Tomar Orden" casi simultáneamente sobre la
  // misma orden PENDING, solo uno de los dos UPDATE afecta realmente la fila;
  // el otro ve 0 cambios y se le informa que ya fue tomada, en vez de que su
  // takerId pise silenciosamente al primero.
  const didTake = await tryTransitionOrderStatus(
    orderId,
    [OrderStatus.Pending],
    OrderStatus.WaitingTakerConfirmation,
    { takerId },
  );
  if (!didTake) return ctx.answerCbQuery(dict.orderTaken, { show_alert: true });

  const typeText =
    order.type === "SELL"
      ? t(ctx.user.language as Language, "actionBuy")
      : t(ctx.user.language as Language, "actionSell");

  await safeDeleteMsg(ctx);

  await ctx.telegram.sendMessage(
    takerId,
    dict.takerAskConfirm({
      type: typeText,
      fiat: order.fiatCode,
      amount: order.amountFiat,
      margin: order.margin,
      method: escapeMarkdown(order.paymentMethod),
      id: order.id,
    }),
    {
      parse_mode: "Markdown",
      ...buildTakerConfirmKeyboard(dict.btnYes, dict.btnNo, order.id),
    },
  );
}

export async function handleTakerConfirm(ctx: BotContext, orderId: string) {
  const takerId = ctx.from?.id;
  const order = await getOrder(orderId);
  if (!order || !takerId) return;
  if (order.status !== OrderStatus.WaitingTakerConfirmation) return;
  if (order.takerId !== takerId) {
    return ctx.answerCbQuery(ctx.dict.unauthorizedAccess, { show_alert: true });
  }
  const dict = getUserDict((await getUser(takerId))?.language);
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

  await proceedAfterTakerAmount(ctx, {
    ...order,
    fiatAmountLocked: exactAmount,
  });
}

export async function proceedAfterTakerAmount(
  ctx: BotContext,
  order: OrderRecord,
) {
  let baseSats = 0;
  try {
    const rateInfo = await getRateInfoFor(
      order.fiatAmountLocked!,
      order.fiatCode,
      order.margin,
    );
    baseSats = rateInfo.satsAmount;
  } catch (error) {
    return handleOrderCancelledRepublish(
      ctx,
      order.id,
      ctx.dict.priceApiErrorRepublish,
    );
  }

  await db
    .update(orders)
    .set({
      takerId: ctx.user.telegramId,
      amountSats: baseSats,
    })
    .where(eq(orders.id, order.id));

  order.amountSats = baseSats;

  const dict = ctx.dict;
  const isTakerBuyer = order.type === "SELL";

  if (isTakerBuyer) {
    ctx.session.awaitingAddressForOrder = order.id;
    const estimatedSats = estimateBuyerSats(baseSats);
    if (estimatedSats === 0) {
      ctx.session.awaitingAddressForOrder = undefined;
      return handleOrderCancelledRepublish(
        ctx,
        order.id,
        dict.priceApiErrorRepublish,
      );
    }
    await ctx.reply(dict.askBuyerAddress(estimatedSats), {
      parse_mode: "Markdown",
    });
  } else {
    await db
      .update(orders)
      .set({ takerId: ctx.user.telegramId })
      .where(eq(orders.id, order.id));
    await ctx.reply(dict.waitMaker, { parse_mode: "Markdown" });
    await notifyMakerForConfirmation(ctx, order);
  }
}

function estimateBuyerSats(baseSats: number): number {
  const botFeePercent = getBotFeePercent(baseSats);
  const totalBotFeeSats = Math.floor(baseSats * (botFeePercent / 100));
  const partyFeeSats = Math.floor(totalBotFeeSats / 2);
  return baseSats - partyFeeSats;
}

export async function notifyMakerForConfirmation(
  ctx: BotContext,
  order: OrderRecord,
) {
  const taker = await getUser(order.takerId!);
  const dict = getUserDict((await getUser(order.creatorId))?.language);

  const daysUsing = taker
    ? Math.floor((Date.now() - taker.createdAt) / 86400000)
    : 0;
  const typeText = order.type === "SELL" ? dict.sellType : dict.buyType; // Perspectiva del Maker

  await db
    .update(orders)
    .set({ status: OrderStatus.WaitingMakerConfirmation })
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
      method: escapeMarkdown(order.paymentMethod),
      trades: taker?.tradesCount || 0,
      days: daysUsing,
      rating: taker?.rating || 0,
      id: order.id,
    }),
    {
      parse_mode: "Markdown",
      ...buildMakerConfirmKeyboard(dict.btnYes, dict.btnNo, order.id),
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
  if (order.status !== OrderStatus.WaitingMakerConfirmation) return;
  if (order.creatorId !== makerId) {
    return ctx.answerCbQuery(ctx.dict.unauthorizedAccess, { show_alert: true });
  }

  const dict = ctx.dict;
  await ctx.editMessageReplyMarkup(undefined);

  const isMakerBuyer = order.type === "BUY";

  if (isMakerBuyer) {
    ctx.session.awaitingAddressForOrder = orderId;
    const estimatedSats = estimateBuyerSats(order.amountSats);

    if (estimatedSats === 0) {
      ctx.session.awaitingAddressForOrder = undefined;

      const takerDict = getUserDict((await getUser(order.takerId!))?.language);
      await ctx.telegram.sendMessage(
        order.takerId!,
        takerDict.priceApiErrorRepublish,
        { parse_mode: "Markdown" },
      );

      return handleOrderCancelledRepublish(
        ctx,
        orderId,
        dict.priceApiErrorRepublish,
      );
    }

    await ctx.reply(dict.askBuyerAddress(estimatedSats), {
      parse_mode: "Markdown",
    });
  } else {
    let taker = await getUser(order.takerId!);
    await ctx.telegram.sendMessage(
      order.takerId!,
      getUserDict(taker?.language).acceptedNowWaitingEscrow,
      { parse_mode: "Markdown" },
    );
    const didTransition = await tryTransitionOrderStatus(
      orderId,
      [OrderStatus.WaitingMakerConfirmation],
      OrderStatus.WaitingEscrow,
    );

    if (didTransition) {
      await initializeEscrow(ctx, orderId);
    }
  }
}
