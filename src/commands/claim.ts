import { getOrder, tryTransitionOrderStatus } from "../db/orders.js";
import type { BotContext, CallbackContext, CommandContext, OrderRecord } from "../types.js";
import { getLiveMinerFee, checkEscrowFunding, DUST_LIMIT, findSpendingTxid } from "../core/bitcoin/index.js";
import { orders } from "../db/schema.js";
import { db } from "../db/index.js";
import { and, eq, or } from "drizzle-orm";
import { OrderStatus } from "../shared/constants.js";
import { buildOrderSelectKeyboard } from "../shared/keyboards.js";
import { getParties } from "../utils/order.js";
import { safeDeleteMsg } from "../utils/telegram.js";
import { getBuyerNetSats, getPartyFeeSats } from "../config/fees.js";
import { Markup } from "telegraf";

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
            eq(orders.status, OrderStatus.Releasable),
            or(
              and(eq(orders.type, "SELL"), eq(orders.takerId, userId)),
              and(eq(orders.type, "BUY"), eq(orders.creatorId, userId)),
            ),
          ),
          and(
            eq(orders.status, OrderStatus.Refundable),
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
  if (order.status !== OrderStatus.Releasable && order.status !== OrderStatus.Refundable) {
    return ctx.reply(dict.invalidOrderStatus);
  }

  const { buyerId, sellerId } = getParties(order);

  if (order.status === OrderStatus.Releasable) {
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
  const isRefund = order.status === OrderStatus.Refundable;
  const baseSats = order.amountSats;

  if (order.escrowAddress) {
    const spentTxid = await findSpendingTxid(order.escrowAddress);
    if (spentTxid) {
      await tryTransitionOrderStatus(
        order.id,
        [OrderStatus.Releasable, OrderStatus.Refundable],
        isRefund ? OrderStatus.ExternallyRefunded : OrderStatus.ExternallyCompleted,
        { payoutTxid: spentTxid },
      );
      return ctx.reply(dict.orderExternallySigned(order.id, spentTxid), {
        parse_mode: "Markdown",
      });
    }
  }

  // Se consulta una sola vez y se reutiliza en el preview y en el monto final.
  const funding = order.escrowAddress
    ? await checkEscrowFunding(order.escrowAddress)
    : null;
  const totalFundedSats = funding?.totalFundedSats ?? baseSats;

  let outputCount = 1;
  if (!isRefund) {
    const botOutputEstimate =
      totalFundedSats - baseSats + getPartyFeeSats(baseSats);
    outputCount = botOutputEstimate >= DUST_LIMIT ? 2 : 1;
  }

  let { satsAmount: minerFeeSats, feeRate } = await getLiveMinerFee({
    escrowAddress: order.escrowAddress!,
    outputCount,
    customFeeRate: ctx.user.customFee,
  });

  const finalAmount = isRefund
    ? totalFundedSats - minerFeeSats
    : getBuyerNetSats(baseSats, minerFeeSats);

  await ctx.reply(
  dict.showClaimPreview(minerFeeSats, finalAmount, receivingAddress, feeRate),
  {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard([
      [Markup.button.callback(dict.btnSignWithPassword, `claim_pass_${order.id}`)],
      [Markup.button.callback(dict.btnSignExternally, `claim_ext_${order.id}`)],
    ]),
  },
);
}
