import {
  createOrder,
  getOrder,
  tryTransitionOrderStatus,
} from "../db/orders.js";
import type { CallbackContext, CommandContext, OrderRecord } from "../types.js";
import { getUser } from "../db/users.js";
import {
  buildOrderSelectKeyboard,
  buildRatingKeyboard,
} from "../shared/keyboards.js";
import { publishOrderToChannel } from "../services/orderPublisher.js";
import { db } from "../db/index.js";
import { orders, users } from "../db/schema.js";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { escapeMarkdown, formatFiatAmount } from "../utils/format.js";
import { OrderStatus } from "../shared/constants.js";
import { Markup } from "telegraf";
import { getParties } from "../utils/order.js";
import { generateOrderId } from "../utils/crypto.js";
import { notifyUser } from "../utils/telegram.js";

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

export async function askReleaseConfirmation(
  ctx: CallbackContext | CommandContext,
  orderId: string,
) {
  const userId = ctx.from.id;

  try {
    if (ctx.callbackQuery) await ctx.deleteMessage();
  } catch (e) {}
  const order = await getOrder(orderId);
  if (!order) return ctx.reply(ctx.dict.orderNotFound);
  if (order.status !== OrderStatus.FiatSent)
    return ctx.reply(ctx.dict.waitForBuyerFiatSent(order.id), {
      parse_mode: "Markdown",
    });

  const { buyerId, sellerId } = getParties(order);
  if (userId !== sellerId) return ctx.reply(ctx.dict.onlySeller);

  const buyer = await getUser(buyerId!);
  return await ctx.reply(
    ctx.dict.askReleaseConfirmation(
      escapeMarkdown(buyer!.username),
      order.id,
      formatFiatAmount(order.fiatAmountLocked!),
      order.fiatCode,
    ),
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback(ctx.dict.btnYes, "confirmRelease_" + order.id)],
        [Markup.button.callback(ctx.dict.btnNo, "cancelRelease")],
      ]),
    },
  );
}

export async function doFundsRelease(
  ctx: CallbackContext | CommandContext,
  order: OrderRecord,
) {
  const { buyerId, sellerId } = getParties(order);
  if (!ctx.from || ctx.from.id !== sellerId) {
    return ctx.reply(ctx.dict.onlySeller);
  }
  try {
    if (ctx.callbackQuery) await ctx.deleteMessage();
  } catch (e) {}

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

  await ctx.reply(ctx.dict.releaseSuccessSeller(order.id), {
    parse_mode: "Markdown",
  });
  await notifyUser(ctx, buyerId!, (d) => d.releaseToBuyer(order.id));

  await ctx.reply(ctx.dict.rateCounterpartyMessage, {
    ...buildRatingKeyboard(order.id),
  });
  await notifyUser(
    ctx,
    buyerId!,
    (d) => d.rateCounterpartyMessage,
    buildRatingKeyboard(order.id),
  );

  if (order.amountFiat.includes("-") && order.fiatAmountLocked) {
    const [minStr, maxStr] = order.amountFiat.split("-");
    const min = parseFloat(minStr!);
    const max = parseFloat(maxStr!);
    const locked = order.fiatAmountLocked;
    const remainingMax = Number((max - locked).toFixed(2));

    if (remainingMax >= min) {
      const newAmountFiat =
        remainingMax === min ? `${min}` : `${min}-${remainingMax}`;

      const newOrderId = generateOrderId();

      await createOrder({
        id: newOrderId,
        type: order.type,
        creatorId: order.creatorId,
        settlementMethod: order.settlementMethod,
        amountFiat: newAmountFiat,
        fiatCode: order.fiatCode,
        paymentMethod: order.paymentMethod,
        margin: order.margin,
      });

      const creator = await getUser(order.creatorId);
      if (creator) {
        await publishOrderToChannel(
          ctx.telegram,
          {
            id: newOrderId,
            type: order.type,
            settlementMethod: order.settlementMethod,
            fiatCode: order.fiatCode,
            amountFiat: newAmountFiat,
            paymentMethod: order.paymentMethod,
            margin: order.margin,
          },
          creator,
        );

        await notifyUser(ctx, creator, (d) =>
          d.rangeOrderPartiallyCompleted(
            newOrderId,
            formatFiatAmount(newAmountFiat),
            order.fiatCode,
          ),
        );
      }
    }
  }
}
