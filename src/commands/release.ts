import {
  createOrder,
  getOrder,
  tryTransitionOrderStatus,
} from "../db/orders.js";
import type { CommandContext } from "../types.js";
import { getUser } from "../db/users.js";
import { dictionaries, t, type Language } from "../locales/index.js";
import {
  buildRatingKeyboard,
  buildTakeOrderKeyboard,
} from "../shared/keyboards.js";
import { db } from "../db/index.js";
import { orders, users } from "../db/schema.js";
import { eq, inArray, sql } from "drizzle-orm";
import crypto from "node:crypto";
import { escapeMarkdown } from "../utils/format.js";

export async function releaseCommand(ctx: CommandContext) {
  const userId = ctx.from.id;
  const dict = ctx.dict;

  const args = ctx.message.text.split(" ");
  if (args.length < 2)
    return ctx.reply(dict.commandUsage("/release <ORDER_ID>"), {
      parse_mode: "Markdown",
    });

  const orderId = args[1] as string;
  const order = await getOrder(orderId);

  if (!order) return ctx.reply(dict.orderNotFound);
  if (order.status !== "FIAT_SENT")
    return ctx.reply(dict.waitForBuyerFiatSent(orderId), {
      parse_mode: "Markdown",
    });

  const isCreatorSelling = order.type === "SELL";
  const sellerId = isCreatorSelling ? order.creatorId : order.takerId;
  const buyerId = isCreatorSelling ? order.takerId : order.creatorId;

  if (userId !== sellerId) return ctx.reply(dict.onlySeller);

  const didRelease = await tryTransitionOrderStatus(
    orderId,
    ["FIAT_SENT"],
    "RELEASABLE",
  );
  if (!didRelease) return ctx.reply(dict.invalidOrderStatus);

  await db
    .update(users)
    .set({ tradesCount: sql`${users.tradesCount} + 1` })
    .where(inArray(users.telegramId, [sellerId!, buyerId!]));

  const buyer = await getUser(buyerId!);
  const dictBuyer = dictionaries[(buyer?.language as Language) || "es"];

  await ctx.reply(dict.releaseSuccessSeller(order.id), {
    parse_mode: "Markdown",
  });
  await ctx.telegram.sendMessage(buyerId!, dictBuyer.releaseToBuyer(order.id), {
    parse_mode: "Markdown",
  });

  await ctx.reply(dict.rateCounterpartyMessage, {
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

      const rawHex = crypto.randomBytes(6).toString("hex").slice(0, 12);
      const newOrderId = rawHex.match(/.{1,6}/g)!.join("-");

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
        const dictCreator =
          dictionaries[(creator.language as Language) || "es"];
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
          dictCreator.rangeOrderPartiallyCompleted(newOrderId, newAmountFiat, order.fiatCode),
          { parse_mode: "Markdown" },
        );
      }
    }
  }
}
