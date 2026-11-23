// ctx.session.step === "CLAIM_PASSWORD"
import { getOrder, tryTransitionOrderStatus } from "../db/orders.js";
import type { CommandContext } from "../types.js";
import {
  broadcastReleaseTx,
  broadcastRefundTx,
} from "../core/bitcoin/index.js";
import { decryptData } from "../utils/crypto.js";
import { OrderStatus } from "../shared/constants.js";
import { getParties } from "../utils/order.js";
import { notifyUser, safeDeleteMsg } from "../utils/telegram.js";
const claimingOrders = new Set<string>();

export async function claimPasswordStep(ctx: CommandContext) {
  const password = ctx.message.text;
  const orderId = ctx.session.claimOrderId;

  ctx.session.step = "IDLE";
  ctx.session.claimOrderId = undefined;

  if (!orderId || claimingOrders.has(orderId)) {
    return ctx.reply(ctx.dict.invalidOrderStatus);
  }
  claimingOrders.add(orderId);

  try {
    return await claimWithPassword(ctx, orderId, password);
  } finally {
    claimingOrders.delete(orderId);
  }
}

async function claimWithPassword(
  ctx: CommandContext,
  orderId: string,
  password: string,
) {
  const userId = ctx.from.id;

  await safeDeleteMsg(ctx);
  const order = await getOrder(orderId!);
  if (!order) return ctx.reply(ctx.dict.orderNotFound);

  if (
    order.status !== OrderStatus.Releasable &&
    order.status !== OrderStatus.Refundable
  )
    return ctx.reply(ctx.dict.invalidOrderStatus);

  const isRefund = order.status === OrderStatus.Refundable;
  const { sellerId, buyerId } = getParties(order)

  if (isRefund && userId !== sellerId) return ctx.reply(ctx.dict.onlySeller);
  if (!isRefund && userId !== buyerId) return ctx.reply(ctx.dict.onlyBuyer);

  let signerMnemonic: string;
  try {
    signerMnemonic = decryptData(ctx.user.encryptedMnemonic!, password);
  } catch (error) {
    return ctx.reply(ctx.dict.invalidPassword(`/claim ${orderId}`), {
      parse_mode: "Markdown",
    });
  }

  const loadingMsg = await ctx.reply(ctx.dict.psbtSigningLoading, {
    parse_mode: "Markdown",
  });

  try {
    const targetStatus = isRefund ? OrderStatus.Refunded : OrderStatus.Completed;
    const currentValidStatus = isRefund ? OrderStatus.Refundable : OrderStatus.Releasable;
    const txid = isRefund
      ? await broadcastRefundTx(order, { mnemonic: signerMnemonic }, ctx.user.customFee)
      : await broadcastReleaseTx(order, { mnemonic: signerMnemonic }, ctx.user.customFee);

    // si por alguna razón el status ya no fuera RELEASABLE/REFUNDABLE
    // (p. ej. dos invocaciones casi simultáneas de /claim), al menos no se
    // sobrescribe silenciosamente un estado que otra ejecución ya haya cambiado.
    const didTransition = await tryTransitionOrderStatus(
      orderId!,
      [currentValidStatus],
      targetStatus,
      { payoutTxid: txid },
    );

    if (!didTransition) {
      console.error(
        `Inconsistencia: TX ${txid} transmitida pero estado en BD no actualizado para orden ${order.id}`,
      );
    }

    await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);

    await ctx.reply(
      isRefund ? ctx.dict.refundSuccess(txid) : ctx.dict.claimSuccess(txid),
      { parse_mode: "Markdown" },
    );

    if (isRefund && buyerId) {
      await notifyUser(ctx, buyerId, (d) =>
        d.refundCompletedNotification(order.id),
      );
    }
  } catch (error: any) {
    await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);
    console.error(error);
    ctx.reply(ctx.dict.errorProcessingTx(error.message), {
      parse_mode: "Markdown",
    });
  }
}
