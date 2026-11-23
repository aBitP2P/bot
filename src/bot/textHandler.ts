import { message } from "telegraf/filters";
import type { Telegraf } from "telegraf";
import type { BotContext } from "../types.js";
import { handleWizardInput } from "../wizards/orderWizard.js";
import {
  notifyMakerForConfirmation,
  proceedAfterTakerAmount,
} from "../handlers/orderHandler.js";
import {
  getOrder,
  setBuyerAddress,
  setFiatAmountLocked,
  tryTransitionOrderStatus,
} from "../db/orders.js";
import { isValidAddress } from "../core/bitcoin/index.js";
import { initializeEscrow } from "../handlers/escrowHandler.js";
import { claimPasswordStep, setPassStep, claimRefundAddressStep } from "../steps/index.js";
import { OrderStatus } from "../shared/constants.js";

export function registerTextHandler(bot: Telegraf<BotContext>) {
  bot.on(message("text"), async (ctx, next) => {
    const text = ctx.message.text;
    if (ctx.session.step === "SET_PASS") {
      await setPassStep(ctx);
      return;
    }

    if (ctx.session.step === "CLAIM_PASSWORD") {
      await claimPasswordStep(ctx);
      return;
    }

    if (ctx.session.step === "CLAIM_REFUND_ADDRESS") {
      await claimRefundAddressStep(ctx);
      return;
    }

    if (ctx.session.step !== "IDLE") {
      return handleWizardInput(ctx);
    }

    const orderToSetAmount = ctx.session.awaitingAmountForOrder;
    if (orderToSetAmount) {
      const order = await getOrder(orderToSetAmount);
      if (
        !order ||
        order.status !== OrderStatus.WaitingTakerConfirmation ||
        order.takerId !== ctx.from.id
      ) {
        ctx.session.awaitingAmountForOrder = undefined;
        return next();
      }

      const [minStr, maxStr] = order.amountFiat.split("-");
      const min = parseFloat(minStr!);
      const max = parseFloat(maxStr!);
      const normalizedText = text.trim().replaceAll(",", ".");
      const inputAmount = Number(normalizedText);

      const dict = ctx.dict;

      if (
        !/^\d+(\.\d{1,2})?$/.test(normalizedText) ||
        isNaN(inputAmount) ||
        inputAmount < min ||
        inputAmount > max
      ) {
        return ctx.reply(dict.invalidAmountRange(min, max), {
          parse_mode: "Markdown",
        });
      }

      await setFiatAmountLocked(order.id, inputAmount);
      ctx.session.awaitingAmountForOrder = undefined;

      return proceedAfterTakerAmount(ctx, {
        ...order,
        fiatAmountLocked: inputAmount, // Para evitar volver a hacer un fetch después
      });
    }

    const orderId = ctx.session.awaitingAddressForOrder;

    if (orderId) {
      const address = ctx.message.text.trim();
      const order = await getOrder(orderId);

      if (
        !order ||
        (order.status !== OrderStatus.WaitingTakerConfirmation &&
          order.status !== OrderStatus.WaitingMakerConfirmation)
      ) {
        ctx.session.awaitingAddressForOrder = undefined;
        return next();
      }

      if (!isValidAddress(address)) {
        return ctx.reply(ctx.dict.invalidBuyerAddress, {
          parse_mode: "Markdown",
        });
      }

      await setBuyerAddress(orderId, address);
      ctx.session.awaitingAddressForOrder = undefined;

      const dict = ctx.dict;

      if (order.status === OrderStatus.WaitingTakerConfirmation) {
        await ctx.reply(dict.waitMaker, { parse_mode: "Markdown" });
        await notifyMakerForConfirmation(ctx, order);
      } else if (order.status === OrderStatus.WaitingMakerConfirmation) {
        const didTransition = await tryTransitionOrderStatus(
          orderId,
          [OrderStatus.WaitingMakerConfirmation],
          OrderStatus.WaitingEscrow,
        );

        if (didTransition) {
          await ctx.reply(dict.waitTaker, { parse_mode: "Markdown" });
          await initializeEscrow(ctx, orderId);
        }
      }
      return;
    }

    return next();
  });
}
