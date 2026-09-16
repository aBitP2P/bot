// ctx.session.step === "CLAIM_PASSWORD"
import { getOrder, tryTransitionOrderStatus } from "../db/orders.js";
import type { CommandContext } from "../types.js";
import {
  broadcastReleaseTx,
  broadcastRefundTx,
} from "../core/bitcoin/index.js";
import { decryptData } from "../utils/crypto.js";
import { getUser } from "../db/users.js";
import { dictionaries, type Language } from "../locales/index.js";
import { OrderStatus } from "../shared/constants.js";

export async function claimPasswordStep(ctx: CommandContext) {
  const text = ctx.message.text;
  const password = text;
  const orderId = ctx.session.claimOrderId;
  const userId = ctx.from.id;

  ctx.session.step = "IDLE";
  ctx.session.claimOrderId = undefined;
  try {
    await ctx.deleteMessage();
  } catch (e) {}

  const order = await getOrder(orderId!);
  if (!order) return ctx.reply(ctx.dict.orderNotFound);

  if (
    order.status !== OrderStatus.RELEASABLE &&
    order.status !== OrderStatus.REFUNDABLE
  )
    return ctx.reply(ctx.dict.invalidOrderStatus);

  const isRefund = order.status === "REFUNDABLE";
  const isCreatorSelling = order.type === "SELL";
  const sellerId = isCreatorSelling ? order.creatorId : order.takerId;
  const buyerId = isCreatorSelling ? order.takerId : order.creatorId;

  if (isRefund && userId !== sellerId) return ctx.reply(ctx.dict.onlySeller);
  if (!isRefund && userId !== buyerId) return ctx.reply(ctx.dict.onlyBuyer);

  let signerWif: string;
  try {
    signerWif = decryptData(ctx.user.encryptedWif!, password);
  } catch (error) {
    return ctx.reply(ctx.dict.invalidPassword(`/claim ${orderId}`), {
      parse_mode: "Markdown",
    });
  }

  const loadingMsg = await ctx.reply(ctx.dict.psbtSigningLoading, {
    parse_mode: "Markdown",
  });

  try {
    const targetStatus = isRefund ? "REFUNDED" : "COMPLETED";
    const currentValidStatus = isRefund ? "REFUNDABLE" : "RELEASABLE";
    let txid = "";
    try {
      txid = isRefund
      ? await broadcastRefundTx(order, signerWif, ctx.user.customFee)
      : await broadcastReleaseTx(order, signerWif, ctx.user.customFee);
    } catch (error: any) {
      throw error;
    }

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
      const buyer = await getUser(buyerId);
      const buyerDict = dictionaries[(buyer?.language as Language) || "es"];
      await ctx.telegram.sendMessage(
        buyerId,
        buyerDict.refundCompletedNotification(order.id),
        { parse_mode: "Markdown" },
      );
    }
  } catch (error: any) {
    await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);
    console.error(error);
    return ctx.reply(ctx.dict.errorProcessingTx(error.message), {
      parse_mode: "Markdown",
    });
  }
}
