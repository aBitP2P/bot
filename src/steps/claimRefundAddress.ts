import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { getOrder } from "../db/orders.js";
import { orders } from "../db/schema.js";
import type { CommandContext } from "../types.js";
import { isValidAddress } from "../core/bitcoin/index.js";
import { startClaimPasswordFlow } from "../commands/claim.js";

export async function claimRefundAddressStep(ctx: CommandContext) {
  const address = ctx.message.text.trim();
  const orderId = ctx.session.claimOrderId;
  const order = orderId ? await getOrder(orderId) : undefined;

  if (!order) {
    ctx.session.step = "IDLE";
    ctx.session.claimOrderId = undefined;
    return ctx.reply(ctx.dict.orderNotFound);
  }

  if (!isValidAddress(address)) {
    return ctx.reply(ctx.dict.invalidRefundAddress, { parse_mode: "Markdown" });
  }

  await db
    .update(orders)
    .set({ refundAddress: address })
    .where(eq(orders.id, order.id));

  const updatedOrder = { ...order, refundAddress: address };
  return startClaimPasswordFlow(ctx, updatedOrder, address);
}
