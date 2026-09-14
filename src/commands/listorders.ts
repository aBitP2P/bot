import type { CommandContext } from "../types.js";
import { getUserOrders } from "../db/orders.js";
import { escapeMarkdown } from "../utils/format.js";

export async function listOrdersCommand(ctx: CommandContext) {
  if (!ctx.from) return;
  const userId = ctx.from.id;

  let userOrders = await getUserOrders(userId);

  if (userOrders.length === 0) return ctx.reply(ctx.dict.noOrdersFound);
  userOrders = userOrders.map((o) => ({ ...o, paymentMethod: escapeMarkdown(o.paymentMethod) }))
  await ctx.reply(ctx.dict.listOrders(userOrders), { parse_mode: "Markdown" });
}