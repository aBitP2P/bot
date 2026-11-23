import { Markup, type Telegraf } from "telegraf";
import type { BotContext } from "../types.js";
import { getUser } from "../db/users.js";
import { getOrder, setExternalPsbt, tryTransitionOrderStatus } from "../db/orders.js";
import {
  buildRefundPsbt,
  buildReleasePsbt,
  findSpendingTxid,
  getLiveMinerFee,
} from "../core/bitcoin/index.js";
import { OrderStatus } from "../shared/constants.js";
import { notifyUser, safeRemoveMarkup } from "../utils/telegram.js";
import { getParties } from "../utils/order.js";

const generatingExternalPsbt = new Set<string>();

export function registerClaimActions(bot: Telegraf<BotContext>) {
  bot.action(/^claim_pass_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const orderId = ctx.match[1];
    const order = await getOrder(orderId!);
    await safeRemoveMarkup(ctx);
    if (!order) return await ctx.reply(ctx.dict.orderNotFound);

    ctx.session.step = "CLAIM_PASSWORD";
    ctx.session.claimOrderId = orderId;

    await ctx.reply(ctx.dict.typePassword);
  });

  bot.action(/^claim_ext_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const orderId = ctx.match[1];
    if (!orderId || generatingExternalPsbt.has(orderId)) return;

    const order = await getOrder(orderId);
    if (!order) return await ctx.reply(ctx.dict.orderNotFound);

    const userId = ctx.from.id;
    const { buyerId, sellerId } = getParties(order);

    const isBuyerClaim =
      buyerId === userId && order.status === OrderStatus.Releasable;
    const isSellerRefund =
      sellerId === userId && order.status === OrderStatus.Refundable;

    if (!isBuyerClaim && !isSellerRefund) {
      return await ctx.reply(ctx.dict.invalidOrderStatus);
    }

    generatingExternalPsbt.add(orderId);
    try {
      if (order.escrowAddress) {
        const spentTxid = await findSpendingTxid(order.escrowAddress);
        if (spentTxid) {
          await tryTransitionOrderStatus(
            order.id,
            [OrderStatus.Releasable, OrderStatus.Refundable],
            isSellerRefund
              ? OrderStatus.ExternallyRefunded
              : OrderStatus.ExternallyCompleted,
            { payoutTxid: spentTxid },
          );
          return await ctx.reply(
            ctx.dict.orderExternallySigned(order.id, spentTxid),
            { parse_mode: "Markdown" },
          );
        }
      }

      if (isSellerRefund && !order.refundAddress) {
        ctx.session.step = "CLAIM_REFUND_ADDRESS";
        ctx.session.claimOrderId = order.id;
        return await ctx.reply(ctx.dict.askRefundAddress, {
          parse_mode: "Markdown",
        });
      }

      await ctx.editMessageReplyMarkup(undefined).catch(() => {});

      let psbtBuffer: Buffer;

      if (order.externalPsbt) {
        psbtBuffer = Buffer.from(order.externalPsbt, "base64");
      } else {
        const user = await getUser(userId);
        const { feeRate } = await getLiveMinerFee({
          escrowAddress: order.escrowAddress,
          customFeeRate: user?.customFee || null,
        });

        const { psbt, escrowBotKeypair } = isBuyerClaim
          ? await buildReleasePsbt(order, feeRate)
          : await buildRefundPsbt(order, feeRate);

        psbt.signAllInputs(escrowBotKeypair);
        psbtBuffer = Buffer.from(psbt.toBuffer());

        await setExternalPsbt(order.id, psbtBuffer.toString("base64"));
      }

      const claimType = isBuyerClaim ? "claim" : "refund";

      await ctx.replyWithDocument(
        {
          source: psbtBuffer,
          filename: `abitp2p-${claimType}-${order.id}.psbt`,
        },
        {
          caption: ctx.dict.externalSignInstructions,
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback(
                ctx.dict.btnConfirmExternalBroadcast,
                `confirm_broadcast_${order.id}`,
              ),
            ],
          ]),
        },
      );
    } catch (err) {
      console.error("Error generando PSBT externo:", err);
      await ctx.reply(
        ctx.dict.errorProcessingTx(
          err instanceof Error ? err.message : String(err),
        ),
        { parse_mode: "Markdown" },
      );
    } finally {
      generatingExternalPsbt.delete(orderId);
    }
  });

  bot.action(/^confirm_broadcast_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const orderId = ctx.match[1];
    if (!orderId) return;

    const order = await getOrder(orderId);
    if (!order) return await ctx.reply(ctx.dict.orderNotFound);

    const userId = ctx.from.id;
    const { buyerId, sellerId } = getParties(order);

    if (userId !== buyerId && userId !== sellerId) {
      return await ctx.reply(ctx.dict.unauthorizedAccess);
    }

    if (
      order.status === OrderStatus.Completed ||
      order.status === OrderStatus.Refunded
    ) {
      await safeRemoveMarkup(ctx);
      return await ctx.reply(
        ctx.dict.orderExternallySigned(order.id, order.payoutTxid),
        { parse_mode: "Markdown" },
      );
    }

    if (
      order.status !== OrderStatus.Releasable &&
      order.status !== OrderStatus.Refundable
    ) {
      return await ctx.reply(ctx.dict.invalidOrderStatus);
    }

    if (!order.escrowAddress) {
      return await ctx.reply(ctx.dict.invalidOrderStatus);
    }

    const spentTxid = await findSpendingTxid(order.escrowAddress);
    if (!spentTxid) {
      return await ctx.reply(ctx.dict.externalBroadcastNotDetected, {
        parse_mode: "Markdown",
      });
    }

    const isRefund = order.status === OrderStatus.Refundable;
    const targetStatus = isRefund
      ? OrderStatus.ExternallyRefunded
      : OrderStatus.ExternallyCompleted;

    const didTransition = await tryTransitionOrderStatus(
      order.id,
      [OrderStatus.Releasable, OrderStatus.Refundable],
      targetStatus,
      {
        payoutTxid: spentTxid,
      },
    );

    if (didTransition) {
      await safeRemoveMarkup(ctx);

      if (isRefund && buyerId) {
        await notifyUser(ctx, buyerId, (d) =>
          d.refundCompletedNotification(order.id),
        );
      }
    }

    return await ctx.reply(ctx.dict.orderExternallySigned(order.id, spentTxid), {
      parse_mode: "Markdown",
    });
  });
}
