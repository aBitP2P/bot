import {
  createOrder,
  getOrder,
  tryTransitionOrderStatus,
} from "../db/orders.js";
import type { CallbackContext, CommandContext, OrderRecord } from "../types.js";
import { getUser } from "../db/users.js";
import { getUserDict, t, type Language } from "../locales/index.js";
import {
  buildOrderSelectKeyboard,
  buildRatingKeyboard,
  buildTakeOrderKeyboard,
} from "../shared/keyboards.js";
import { db } from "../db/index.js";
import { orders, users } from "../db/schema.js";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { escapeMarkdown } from "../utils/format.js";
import { OrderStatus } from "../shared/constants.js";
import { Markup } from "telegraf";
import { getParties } from "../utils/order.js";
import { generateOrderId } from "../utils/crypto.js";

export async function releaseCommand(ctx: CommandContext) {
  const userId = ctx.from.id;

  const args = ctx.message.text.split(" ");
  if (args.length < 2) {
    const fiatSentOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.status, OrderStatus.FiatSent),
          or(
            and(eq(orders.type, "SELL"), eq(orders.creatorId, userId)),
            and(eq(orders.type, "BUY"), eq(orders.takerId, userId)),
          ),
        ),
      );
    if (fiatSentOrders.length === 0)
      await ctx.reply(ctx.dict.noReleasableOrdersFound, {
        parse_mode: "Markdown",
      });
    else
      await ctx.reply(ctx.dict.selectReleasableOrder, {
        ...buildOrderSelectKeyboard(fiatSentOrders, "releaseCommand"),
      });
    return;
  }

  const orderId = args[1] as string;
  await askReleaseConfirmation(ctx, orderId);
}


export async function askReleaseConfirmation(ctx: CallbackContext | CommandContext, orderId: string) {
  const userId = ctx.from.id;

  try { if (ctx.callbackQuery) await ctx.deleteMessage(); } catch (e) {}
  const order = await getOrder(orderId);
  if (!order) return ctx.reply(ctx.dict.orderNotFound);
  if (order.status !== OrderStatus.FiatSent)
    return ctx.reply(ctx.dict.waitForBuyerFiatSent(order.id), {
      parse_mode: "Markdown",
    });
  
  const { buyerId, sellerId } = getParties(order);
  if (userId !== sellerId) return ctx.reply(ctx.dict.onlySeller);

  const buyer = await getUser(buyerId!);
  return await ctx.reply(ctx.dict.askReleaseConfirmation(buyer!.username), {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard([
      [Markup.button.callback(ctx.dict.btnYes, "confirmRelease_" + order.id)],
      [Markup.button.callback(ctx.dict.btnNo, "cancelRelease")]
    ])
  })
}

export async function doFundsRelease(ctx: CallbackContext | CommandContext, order: OrderRecord) {
  const { buyerId, sellerId } = getParties(order);  
  try { if (ctx.callbackQuery) await ctx.deleteMessage(); } catch (e) {}

  const didRelease = await tryTransitionOrderStatus(
    order.id,
    [OrderStatus.FiatSent],
    OrderStatus.Releasable,
  );
  if (!didRelease) return ctx.reply(ctx.dict.invalidOrderStatus);

  await db
    .update(users)
    .set({ tradesCount: sql`${users.tradesCount} + 1` })
    .where(inArray(users.telegramId, [sellerId!, buyerId!]));

  const buyer = await getUser(buyerId!);
  const dictBuyer = getUserDict(buyer?.language);

  await ctx.reply(ctx.dict.releaseSuccessSeller(order.id), {
    parse_mode: "Markdown",
  });
  await ctx.telegram.sendMessage(buyerId!, dictBuyer.releaseToBuyer(order.id), {
    parse_mode: "Markdown",
  });

  await ctx.reply(ctx.dict.rateCounterpartyMessage, {
    ...buildRatingKeyboard(order.id),
  });
  await ctx.telegram.sendMessage(buyerId!, dictBuyer.rateCounterpartyMessage, {
    ...buildRatingKeyboard(order.id),
  });

  if (order.amountFiat.includes("-") && order.fiatAmountLocked) {
    const [minStr, maxStr] = order.amountFiat.split("-");
    const min = parseFloat(minStr!);
    const max = parseFloat(maxStr!);
    const locked = order.fiatAmountLocked;
    const remainingMax = max - locked;

    if (remainingMax >= min) {
      const newAmountFiat =
        remainingMax === min ? `${min}` : `${min}-${remainingMax}`;

      const newOrderId = generateOrderId();

      await createOrder({
        id: newOrderId,
        type: order.type,
        creatorId: order.creatorId,
        amountFiat: newAmountFiat,
        fiatCode: order.fiatCode,
        paymentMethod: order.paymentMethod,
        margin: order.margin,
      });

      const creator = await getUser(order.creatorId);
      if (creator) {
        const dictCreator = getUserDict(creator.language);
        const action =
          order.type === "SELL"
            ? dictCreator.actionSell
            : dictCreator.actionBuy;
        const payDirection =
          order.type === "SELL"
            ? dictCreator.payDirectionSell
            : dictCreator.payDirectionBuy;
        const hashtag = `#${order.type}${order.fiatCode}`;
        const daysUsing = Math.floor(
          (Date.now() - creator.createdAt) / 86400000,
        );
        const tradesCount = creator.tradesCount || 0;

        const orderMessage = dictCreator.channelOrder({
          action,
          amountFiat: newAmountFiat,
          fiat: order.fiatCode,
          payDirection,
          method: escapeMarkdown(order.paymentMethod),
          daysUsing,
          hashtag,
          margin: order.margin,
          rating: creator.rating || 0,
          tradesCount,
          ratingCount: creator.ratingCount,
          id: newOrderId,
        });

        const buttonText =
          order.type === "SELL"
            ? t(creator.language as Language, "btnBuyBitcoin")
            : t(creator.language as Language, "btnSellBitcoin");

        const CHANNEL_ID = process.env.PUBLIC_CHANNEL_ID!;
        const sentChannelMsg = await ctx.telegram.sendMessage(
          CHANNEL_ID,
          orderMessage,
          {
            parse_mode: "Markdown",
            ...buildTakeOrderKeyboard(buttonText, newOrderId),
          },
        );

        await db
          .update(orders)
          .set({ channelMessageId: sentChannelMsg.message_id })
          .where(eq(orders.id, newOrderId));

        await ctx.telegram.sendMessage(
          order.creatorId,
          dictCreator.rangeOrderPartiallyCompleted(
            newOrderId,
            newAmountFiat,
            order.fiatCode,
          ),
          { parse_mode: "Markdown" },
        );
      }
    }
  }
}