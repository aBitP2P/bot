import {
  type BotContext,
  type CallbackContext,
  type CommandContext,
  type OrderRecord,
} from "../types.js";
import { getUser } from "../db/users.js";
import { type Language, getUserDict, t } from "../locales/index.js";
import { Telegraf } from "telegraf";
import { publishOrderToChannel } from "../services/orderPublisher.js";
import { initializeEscrow } from "./escrowHandler.js";
import {
  getOrder,
  getUserOrders,
  setFiatAmountLocked,
  setTakerAndAmount,
  tryTransitionOrderStatus,
} from "../db/orders.js";
import {
  buildMakerConfirmKeyboard,
  buildTakerConfirmKeyboard,
} from "../shared/keyboards.js";
import { getRateInfoFor } from "../utils/price.js";
import { escapeMarkdown, formatFiatAmount, makeStarString } from "../utils/format.js";
import { notifyUser, safeDeleteMsg } from "../utils/telegram.js";
import {
  OrderStatus,
  SettlementMethodType,
  getSettlementMethodLabel,
} from "../shared/constants.js";
import { getBuyerNetSats } from "../config/fees.js";
export async function republishOrderSilently(
  bot: Telegraf<BotContext>,
  orderId: string,
  allowedFromStatuses: string[] = [OrderStatus.WaitingTakerConfirmation],
) {
  const didReset = await tryTransitionOrderStatus(
    orderId,
    allowedFromStatuses,
    OrderStatus.Pending,
    {
      takerId: null,
      buyerAddress: null,
      payoutInvoice: null,
      fiatAmountLocked: null,
      cancelRequestedBy: null,
      holdInvoiceHash: null,
      holdInvoiceRequest: null,
      holdInvoicePreimageEncrypted: null,
      buyerXpub: null,
      sellerXpub: null,
      escrowIndex: 0,
      escrowAddress: null,
      witnessScript: null,
      amountSats: 0,
      createdAt: Date.now(),
    },
  );

  if (!didReset) return false;

  const order = await getOrder(orderId);
  if (!order) return false;

  const orderCreator = await getUser(order.creatorId);
  if (!orderCreator) return false;

  await publishOrderToChannel(bot.telegram, order, orderCreator);
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
      payoutInvoice: null,
      amountSats: 0,
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

  await publishOrderToChannel(ctx.telegram, order!, orderCreator);
}

export async function handleTakeOrder(ctx: CallbackContext, orderId: string) {
  const takerId = ctx.from.id;
  if (!takerId) return;
  const user = ctx.user;
  const dict = ctx.dict;
  if (!user?.xpub) {
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
      amount: formatFiatAmount(order.amountFiat),
      margin: order.margin,
      method: escapeMarkdown(order.paymentMethod),
      network: getSettlementMethodLabel(order.settlementMethod),
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
  const dict = ctx.dict;
  await ctx.editMessageReplyMarkup(undefined);

  if (order.amountFiat.includes("-")) {
    ctx.session.awaitingAmountForOrder = order.id;
    return ctx.reply(dict.promptExactAmount(formatFiatAmount(order.amountFiat), order.fiatCode), {
      parse_mode: "Markdown",
    });
  }

  const exactAmount = parseFloat(order.amountFiat);
  await setFiatAmountLocked(orderId, exactAmount);

  await proceedAfterTakerAmount(ctx, {
    ...order,
    fiatAmountLocked: exactAmount,
  });
}

async function requestBuyerPayoutDetails(
  ctx: BotContext,
  order: OrderRecord,
  estimatedSats: number,
) {
  ctx.session.awaitingAddressForOrder = order.id;

  const isLightning =
    order.settlementMethod === SettlementMethodType.Lightning;

  await ctx.reply(
    isLightning
      ? ctx.dict.askBuyerInvoice(estimatedSats)
      : ctx.dict.askBuyerAddress(estimatedSats),
    { parse_mode: "Markdown" },
  );
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

  await setTakerAndAmount(order.id, ctx.user.telegramId, baseSats);

  order.amountSats = baseSats;

  const dict = ctx.dict;
  const isTakerBuyer = order.type === "SELL";

  if (isTakerBuyer) {
    const estimatedSats = getBuyerNetSats(baseSats);
    if (estimatedSats === 0) {
      ctx.session.awaitingAddressForOrder = undefined;
      return handleOrderCancelledRepublish(
        ctx,
        order.id,
        dict.priceApiErrorRepublish,
      );
    }
    await requestBuyerPayoutDetails(ctx, order, estimatedSats);
  } else {
    await ctx.reply(dict.waitMaker, { parse_mode: "Markdown" });
    await notifyMakerForConfirmation(ctx, order);
  }
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

  const didTransition = await tryTransitionOrderStatus(
    order.id,
    [OrderStatus.WaitingTakerConfirmation],
    OrderStatus.WaitingMakerConfirmation,
  );
  if (!didTransition) return;

  const displayAmount = order.fiatAmountLocked
    ? order.fiatAmountLocked.toString()
    : order.amountFiat;
  const rating = taker?.rating || 0;

  await ctx.telegram.sendMessage(
    order.creatorId,
    dict.makerAskConfirm({
      type: typeText,
      fiat: order.fiatCode,
      amount: formatFiatAmount(displayAmount),
      margin: order.margin,
      method: escapeMarkdown(order.paymentMethod),
      network: getSettlementMethodLabel(order.settlementMethod),
      trades: taker?.tradesCount || 0,
      days: daysUsing,
      ratingLabel: `${makeStarString(rating)} ${rating}/5`,
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
    const estimatedSats = getBuyerNetSats(order.amountSats);

    if (estimatedSats === 0) {
      ctx.session.awaitingAddressForOrder = undefined;

      await notifyUser(
        ctx,
        order.takerId!,
        (d) => d.priceApiErrorRepublish,
      );

      return handleOrderCancelledRepublish(
        ctx,
        orderId,
        dict.priceApiErrorRepublish,
      );
    }

    await requestBuyerPayoutDetails(ctx, order, estimatedSats);
  } else {
    await notifyUser(ctx, order.takerId!, (d) => d.acceptedNowWaitingEscrow);
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
