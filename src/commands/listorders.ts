import { eq, or, and, notInArray, ne } from "drizzle-orm";
import { db } from "../db/index.js";
import { orders } from "../db/schema.js";
import type { CommandContext } from "../types.js";

export async function listOrdersCommand(ctx: CommandContext) {
  if (!ctx.from) return;
  const userId = ctx.from.id;

  const userOrders = await db.select().from(orders).where(
    and(
      or(eq(orders.creatorId, userId), eq(orders.takerId, userId)),
      notInArray(orders.status, ["COMPLETED", "CANCELLED", "REFUNDED"]),
      or(
        ne(orders.status, "PENDING"),
        eq(orders.creatorId, userId)
      )
    )
  );

  if (userOrders.length === 0) return ctx.reply(ctx.dict.noOrdersFound);
  await ctx.reply(ctx.dict.listOrders(userOrders), { parse_mode: "Markdown" });
}