import { getOrder, tryTransitionOrderStatus } from "../db/orders.js";
import type { CommandContext } from "../types.js";
import { getUser } from "../db/users.js";
import { dictionaries, type Language } from "../locales/index.js";
import { isAdmin } from "../utils/admin.js";
import { buildRatingKeyboard } from "../shared/keyboards.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { inArray, sql } from "drizzle-orm";

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
    return ctx.reply(dict.waitForBuyerFiatSent(orderId), { parse_mode: 'Markdown' });

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
    ...buildRatingKeyboard(order.id)
  });
  await ctx.telegram.sendMessage(buyerId!, dictBuyer.rateCounterpartyMessage, {
    ...buildRatingKeyboard(order.id)
  });
}
