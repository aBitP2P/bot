import type { CommandContext } from "../types.js";
import { getUserOrders } from "../db/orders.js";

export async function listOrdersCommand(ctx: CommandContext) {
  if (!ctx.from) return;
  const userId = ctx.from.id;

  const userOrders = await getUserOrders(userId);

  if (userOrders.length === 0) return ctx.reply(ctx.dict.noOrdersFound);
  await ctx.reply(ctx.dict.listOrders(userOrders), { parse_mode: "Markdown" });
}