import { getOrder } from "../db/orders.js";
import { getUser } from "../db/users.js";
import { dictionaries, type Language } from "../locales/index.js";
import type { CommandContext } from "../types.js";
import { getLiveMinerFee, checkEscrowFunding } from "../core/bitcoin/index.js";
import { orders } from "../db/schema.js";

export async function claimCommand(ctx: CommandContext) {
  const userId = ctx.from.id;

  const userRecord = await getUser(userId);
  if (!userRecord) return;

  const dict = dictionaries[(userRecord.language as Language) || 'es'];

  const args = ctx.message.text.split(' ');
  if (args.length < 2) return ctx.reply(dict.commandUsage('/claim <ORDER_ID>'), { parse_mode: 'Markdown' });

  const orderId = args[1] as string;
  const order = await getOrder(orderId);

  if (!order) return ctx.reply(dict.orderNotFound);
  if (order.status !== 'RELEASABLE' && order.status !== 'REFUNDABLE') {
    return ctx.reply(dict.invalidOrderStatus);
  }

  const isCreatorSelling = order.type === 'SELL';
  const buyerId = isCreatorSelling ? order.takerId : order.creatorId;
  const sellerId = isCreatorSelling ? order.creatorId : order.takerId;

  if (order.status === 'RELEASABLE') {
    if (userId !== buyerId) return ctx.reply(dict.onlyBuyer);
    return startClaimPasswordFlow(ctx, order, order.buyerAddress!);
  }

  // Flujo de reembolso: solo el vendedor puede reclamar
  if (userId !== sellerId) return ctx.reply(dict.onlySeller);

  if (!order.refundAddress) {
    ctx.session.step = 'CLAIM_REFUND_ADDRESS';
    ctx.session.claimOrderId = order.id;
    return ctx.reply(dict.askRefundAddress, { parse_mode: 'Markdown' });
  }

  return startClaimPasswordFlow(ctx, order, order.refundAddress);
}

export async function startClaimPasswordFlow(
  ctx: CommandContext,
  order: typeof orders.$inferSelect,
  receivingAddress: string
) {
  const dict = ctx.dict;
  const isRefund = order.status === 'REFUNDABLE';
  const minerFeeSats = await getLiveMinerFee(order.escrowAddress!, isRefund ? 1 : (parseFloat(process.env.BOT_FEE!) === 0.0 ? 1 : 2));

  let finalAmount: number;

  if (isRefund) {
    // En reembolso devolvemos TODO lo depositado en el escrow (incluye la parte
    // de la comisión del bot que el vendedor pagó al fondear), menos solo la fee de minería.
    const funding = await checkEscrowFunding(order.escrowAddress!);
    const totalFundedSats = funding?.totalFundedSats ?? order.amountSats;
    finalAmount = totalFundedSats - minerFeeSats;
  } else {
    const baseSats = order.amountSats;
    const totalBotFee = parseFloat(process.env.BOT_FEE!);
    const totalBotFeeSats = Math.floor(baseSats * (totalBotFee / 100));
    const buyerFeeSats = Math.floor(totalBotFeeSats / 2);
    finalAmount = baseSats - buyerFeeSats - minerFeeSats;
  }

  ctx.session.step = 'CLAIM_PASSWORD';
  ctx.session.claimOrderId = order.id;

  await ctx.reply(
    dict.askClaimPassword(minerFeeSats, finalAmount, receivingAddress),
    { parse_mode: 'Markdown' }
  );
}
