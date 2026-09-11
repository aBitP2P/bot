// ctx.session.step === "CLAIM_PASSWORD"

import { eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { getOrder, tryTransitionOrderStatus } from "../db/orders.js";
import { orders, users } from "../db/schema.js";
import type { CommandContext } from "../types.js";
import { broadcastReleaseTx, broadcastRefundTx } from "../core/bitcoin/index.js";
import { decryptData } from "../utils/crypto.js";
import { getUser } from "../db/users.js";
import { dictionaries, type Language } from "../locales/index.js";

export async function claimPasswordStep(ctx: CommandContext) {
  const text = ctx.message.text;
  const password = text;
  const orderId = ctx.session.claimOrderId;

  ctx.session.step = "IDLE";
  ctx.session.claimOrderId = undefined;
  try {
    await ctx.deleteMessage();
  } catch (e) {}

  const order = await getOrder(orderId!);
  if (!order) return ctx.reply(ctx.dict.orderNotFound);

  const isRefund = order.status === "REFUNDABLE";

  let signerWif: string;
  try {
    signerWif = decryptData(ctx.user.encryptedWif!, password);
  } catch (error) {
    return ctx.reply(ctx.dict.invalidPassword(`/claim ${orderId}`), { parse_mode: 'Markdown' });
  }

  const loadingMsg = await ctx.reply(
    ctx.dict.psbtSigningLoading,
    { parse_mode: "Markdown" },
  );

  try {
    const txid = isRefund
      ? await broadcastRefundTx(order, signerWif)
      : await broadcastReleaseTx(order, signerWif);

    // si por alguna razón el status ya no fuera RELEASABLE/REFUNDABLE
    // (p. ej. dos invocaciones casi simultáneas de /claim), al menos no se
    // sobrescribe silenciosamente un estado que otra ejecución ya haya cambiado.
    await tryTransitionOrderStatus(
      orderId!,
      [isRefund ? "REFUNDABLE" : "RELEASABLE"],
      isRefund ? "REFUNDED" : "COMPLETED",
      { payoutTxid: txid },
    );

    await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);

    await ctx.reply(
      isRefund ? ctx.dict.refundSuccess(txid) : ctx.dict.claimSuccess(txid),
      { parse_mode: "Markdown" },
    );

    if (isRefund) {
      const isCreatorSelling = order.type === "SELL";
      const buyerId = isCreatorSelling ? order.takerId : order.creatorId;
      if (buyerId) {
        const buyer = await getUser(buyerId);
        const buyerDict = dictionaries[(buyer?.language as Language) || "es"];
        await ctx.telegram.sendMessage(
          buyerId,
          buyerDict.refundCompletedNotification(order.id),
          { parse_mode: "Markdown" },
        );
      }
    }
  } catch (error: any) {
    await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);
    console.error(error);
    return ctx.reply(ctx.dict.errorProcessingTx(error.message), {
      parse_mode: "Markdown",
    });
  }
}
