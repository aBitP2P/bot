import { and, eq, or } from "drizzle-orm";
import { db } from "../db/index.js";
import { getOrder, tryTransitionOrderStatus } from "../db/orders.js";
import { orders } from "../db/schema.js";
import { getUser } from "../db/users.js";
import { getUserDict } from "../locales/index.js";
import type { CallbackContext, CommandContext } from "../types.js";
import { escapeMarkdown } from "../utils/format.js";
import { buildOrderSelectKeyboard } from "../shared/keyboards.js";
import { OrderStatus } from "../shared/constants.js";
import { getParties } from "../utils/order.js";

export async function fiatsentCommand(ctx: CommandContext) {
  const userId = ctx.from.id;
  const dict = ctx.dict;

  const args = ctx.message.text.split(" ");
  if (args.length < 2) {
    const activeOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.status, OrderStatus.ACTIVE),
          or(
            and(eq(orders.type, "SELL"), eq(orders.takerId, userId)),
            and(eq(orders.type, "BUY"), eq(orders.creatorId, userId)),
          ),
        ),
      );

    if (activeOrders.length === 0)
      await ctx.reply(dict.noActiveOrdersFound, { parse_mode: "Markdown" });
    else
      await ctx.reply(dict.selectOrderToMarkAsPaid, {
        ...buildOrderSelectKeyboard(activeOrders, "fiatsentCommand"),
      });
    return;
  }

  const orderId = args[1] as string;
  await markAsFiatSent(ctx, orderId);
}

export async function markAsFiatSent(ctx: CallbackContext | CommandContext, orderId: string) {
  const order = await getOrder(orderId);
  const userId = ctx.from.id;
  const dict = ctx.dict;

  try { if (ctx.callbackQuery) await ctx.deleteMessage(); } catch(e) {}
  if (!order) return ctx.reply(dict.orderNotFound); 
  if (order.status !== OrderStatus.ACTIVE) return ctx.reply(dict.invalidOrderStatus);

  const { buyerId, sellerId } = getParties(order);

  if (userId !== buyerId) return ctx.reply(dict.onlyBuyer);

  const didMark = await tryTransitionOrderStatus(
    orderId,
    [OrderStatus.ACTIVE],
    OrderStatus.FIAT_SENT,
  );
  if (!didMark) return ctx.reply(dict.invalidOrderStatus);

  const seller = await getUser(sellerId!);
  const dictSeller = getUserDict(seller?.language);
  const buyerName = ctx.from.username
    ? escapeMarkdown(ctx.from.username)
    : "El comprador";

  await ctx.reply(dict.fiatSentToBuyer(order.id), { parse_mode: "Markdown" });
  await ctx.telegram.sendMessage(
    sellerId!,
    dictSeller.fiatSentToSeller(order.id, buyerName),
    { parse_mode: "Markdown" },
  );
}