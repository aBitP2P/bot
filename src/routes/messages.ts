import type { Telegraf } from "telegraf";
import type { BotContext } from "../types.js";
import { message } from "telegraf/filters";
import { setPassStep } from "../steps/setPass.js";
import { claimPasswordStep } from "../steps/claimPassword.js";
import { claimRefundAddressStep } from "../steps/claimRefundAddress.js";
import { handleLoanWizardInput } from "../wizards/loanWizard.js";
import { handleWizardInput } from "../wizards/orderWizard.js";
import { getOrder, tryTransitionOrderStatus } from "../db/orders.js";
import { LoanStatus, OrderStatus } from "../shared/constants.js";
import { db } from "../db/index.js";
import { loans, orders } from "../db/schema.js";
import { eq } from "drizzle-orm";
import {
  notifyMakerForConfirmation,
  proceedAfterTakerAmount,
} from "../handlers/orderHandler.js";
import { isValidAddress } from "../core/bitcoin/wallet.js";
import { initializeEscrow } from "../handlers/escrowHandler.js";
import { getLoan } from "../db/loans.js";
import {
  askLoanTakerFinalConfirmation,
  proceedAfterLoanTakerAmount,
} from "../handlers/loanHandler.js";

export function setupMessages(bot: Telegraf<BotContext>) {
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

    if (ctx.session.step.startsWith("WAITING_LOAN_")) {
      return handleLoanWizardInput(ctx);
    } else if (ctx.session.step !== "IDLE") {
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
      const inputAmount = parseFloat(text.replaceAll(",", "."));

      const dict = ctx.dict;

      if (isNaN(inputAmount) || inputAmount < min || inputAmount > max) {
        return ctx.reply(dict.invalidAmountRange(min, max), {
          parse_mode: "Markdown",
        });
      }

      await db
        .update(orders)
        .set({ fiatAmountLocked: inputAmount })
        .where(eq(orders.id, order.id));
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

      await db
        .update(orders)
        .set({ buyerAddress: address })
        .where(eq(orders.id, orderId));
      ctx.session.awaitingAddressForOrder = undefined;

      const dict = ctx.dict;

      if (order.status === OrderStatus.WaitingTakerConfirmation) {
        await ctx.reply(dict.waitMaker, { parse_mode: "Markdown" });
        await notifyMakerForConfirmation(ctx, order);
      } else if (order.status === OrderStatus.WaitingMakerConfirmation) {
        await ctx.reply(dict.waitTaker, { parse_mode: "Markdown" });
        const didTransition = await tryTransitionOrderStatus(
          orderId,
          [OrderStatus.WaitingMakerConfirmation],
          OrderStatus.WaitingEscrow,
        );

        if (didTransition) {
          await initializeEscrow(ctx, orderId);
        }
      }
      return;
    }

    const loanToSetAmount = ctx.session.awaitingAmountForLoan;
    if (loanToSetAmount) {
      const loan = await getLoan(loanToSetAmount);
      if (
        !loan ||
        loan.status !== LoanStatus.WaitingTakerConfirmation ||
        loan.takerId !== ctx.from.id
      ) {
        ctx.session.awaitingAmountForLoan = undefined;
        return next();
      }

      const [minStr, maxStr] = loan.amountFiat.split("-");
      const min = parseFloat(minStr!);
      const max = parseFloat(maxStr!);
      const inputAmount = parseFloat(text.replaceAll(",", "."));

      if (isNaN(inputAmount) || inputAmount < min || inputAmount > max) {
        return ctx.reply(ctx.dict.invalidAmountRange(min, max), {
          parse_mode: "Markdown",
        });
      }

      await db
        .update(loans)
        .set({ fiatAmountLocked: inputAmount })
        .where(eq(loans.id, loan.id));
      ctx.session.awaitingAmountForLoan = undefined;

      return proceedAfterLoanTakerAmount(ctx, {
        ...loan,
        fiatAmountLocked: inputAmount,
      });
    }

    const loanToSetDuration = ctx.session.awaitingDurationForLoan;
    if (loanToSetDuration) {
      const loan = await getLoan(loanToSetDuration);
      if (
        !loan ||
        loan.status !== LoanStatus.WaitingTakerConfirmation ||
        loan.takerId !== ctx.from.id
      ) {
        ctx.session.awaitingDurationForLoan = undefined;
        return next();
      }

      const [minStr, maxStr] = loan.durationMonths.split("-");
      const min = parseInt(minStr!, 10);
      const max = parseInt(maxStr!, 10);
      const inputDuration = parseInt(text, 10);

      if (isNaN(inputDuration) || inputDuration < min || inputDuration > max) {
        return ctx.reply(ctx.dict.invalidLoanDurationRange(min, max));
      }

      await db
        .update(loans)
        .set({ durationMonths: inputDuration.toString() })
        .where(eq(loans.id, loan.id));
      ctx.session.awaitingDurationForLoan = undefined;

      return askLoanTakerFinalConfirmation(ctx, {
        ...loan,
        durationMonths: inputDuration.toString(),
      });
    }

    return next();
  });
}
