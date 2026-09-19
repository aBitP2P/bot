import { getOrder } from "../db/orders.js";
import type { BotContext, CallbackContext, CommandContext, OrderRecord } from "../types.js";
import { getLiveMinerFee, checkEscrowFunding, DUST_LIMIT } from "../core/bitcoin/index.js";
import { orders } from "../db/schema.js";
import { db } from "../db/index.js";
import { and, eq, or } from "drizzle-orm";
import { OrderStatus } from "../shared/constants.js";
import { buildOrderSelectKeyboard } from "../shared/keyboards.js";
import { getParties } from "../utils/order.js";
import { safeDeleteMsg } from "../utils/telegram.js";
import { getBotFeePercent } from "../config/fees.js";

export async function claimCommand(ctx: CommandContext) {
  const userId = ctx.from.id;
  const dict = ctx.dict;

  const args = ctx.message.text.split(" ");
  if (args.length < 2) {
    const claimableOrders = await db
      .select()
      .from(orders)
      .where(
        or(
          and(
            eq(orders.status, OrderStatus.RELEASABLE),
            or(
              and(eq(orders.type, "SELL"), eq(orders.takerId, userId)),
              and(eq(orders.type, "BUY"), eq(orders.creatorId, userId)),
            ),
          ),
          and(
            eq(orders.status, OrderStatus.REFUNDABLE),
            or(
              and(eq(orders.type, "SELL"), eq(orders.creatorId, userId)),
              and(eq(orders.type, "BUY"), eq(orders.takerId, userId)),
            ),
          ),
        ),
      );

    if (claimableOrders.length === 0)
      await ctx.reply(dict.noClaimableOrdersFound, { parse_mode: "Markdown" });
    else
      await ctx.reply(dict.selectClaimableOrder, {
        ...buildOrderSelectKeyboard(claimableOrders, "claimCommand"),
      });
    return;
  }

  const orderId = args[1] as string;
  await initiateClaim(ctx, orderId);
}

export async function initiateClaim(
  ctx: CallbackContext | CommandContext,
  orderId: string,
) {
  const userId = ctx.from.id;
  const dict = ctx.dict;

  await safeDeleteMsg(ctx);

  const order = await getOrder(orderId);

  if (!order) return ctx.reply(dict.orderNotFound);
  if (order.status !== OrderStatus.RELEASABLE && order.status !== OrderStatus.REFUNDABLE) {
    return ctx.reply(dict.invalidOrderStatus);
  }

  const { buyerId, sellerId } = getParties(order);

  if (order.status === OrderStatus.RELEASABLE) {
    if (userId !== buyerId) return ctx.reply(dict.onlyBuyer);
    return startClaimPasswordFlow(ctx, order, order.buyerAddress!);
  }

  // Flujo de reembolso: solo el vendedor puede reclamar
  if (userId !== sellerId) return ctx.reply(dict.onlySeller);

  if (!order.refundAddress) {
    ctx.session.step = "CLAIM_REFUND_ADDRESS";
    ctx.session.claimOrderId = order.id;
    return ctx.reply(dict.askRefundAddress, { parse_mode: "Markdown" });
  }

  return startClaimPasswordFlow(ctx, order, order.refundAddress);
}

export async function startClaimPasswordFlow(
  ctx: BotContext,
  order: OrderRecord,
  receivingAddress: string,
) {
  const dict = ctx.dict;
  const isRefund = order.status === OrderStatus.REFUNDABLE;
  const baseSats = order.amountSats;
  const botFeePercent = getBotFeePercent(baseSats); // <-- Obtener comisión
  
  let outputCount = 1;
  let totalFundedSats = baseSats;

  if (!isRefund) {
    const funding = await checkEscrowFunding(order.escrowAddress!);
    totalFundedSats = funding?.totalFundedSats ?? baseSats;
    const buyerFee = Math.floor((baseSats * (botFeePercent / 100)) / 2);
    const botOutputEstimate = totalFundedSats - baseSats + buyerFee;
    outputCount = botOutputEstimate >= DUST_LIMIT ? 2 : 1;
  }

  let { satsAmount: minerFeeSats, feeRate } = await getLiveMinerFee({
    escrowAddress: order.escrowAddress!,
    outputCount,
    customFeeRate: ctx.user.customFee,
  });

  let finalAmount: number;

  if (isRefund) {
    // En reembolso devolvemos TODO lo depositado en el escrow (incluye la parte
    // de la comisión del bot que el vendedor pagó al fondear), menos solo la fee de minería.
    const funding = await checkEscrowFunding(order.escrowAddress!);
    const totalFundedSats = funding?.totalFundedSats ?? order.amountSats;
    finalAmount = totalFundedSats - minerFeeSats;
  } else {
    const totalBotFeeSats = Math.floor(baseSats * (botFeePercent / 100));
    const buyerFeeSats = Math.floor(totalBotFeeSats / 2);
    finalAmount = baseSats - buyerFeeSats - minerFeeSats;
  }

  ctx.session.step = "CLAIM_PASSWORD";
  ctx.session.claimOrderId = order.id;

  await ctx.reply(
    dict.askClaimPassword(minerFeeSats, finalAmount, receivingAddress, feeRate),
    { parse_mode: "Markdown" },
  );
}
