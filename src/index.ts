import "dotenv/config";
import { Telegraf, session } from "telegraf";
import { type BotContext, type SessionData } from "./types.js";
import {
  startOrderWizard,
  cancelWizard,
  handleWizardInput,
  handleWizardAction,
} from "./wizards/orderWizard.js";
import { dictionaries, t, type Language } from "./locales/index.js";
import { getUser } from "./db/users.js";
import {
  handleMakerConfirm,
  handleOrderCancelledRepublish,
  handleTakeOrder,
  handleTakerConfirm,
  notifyMakerForConfirmation,
  proceedAfterTakerAmount,
} from "./handlers/orderHandler.js";
import { getOrder, tryTransitionOrderStatus } from "./db/orders.js";
import { message } from "telegraf/filters";
import { orders } from "./db/schema.js";
import { db } from "./db/index.js";
import { eq } from "drizzle-orm";
import { isValidAddress } from "./utils/bitcoin.js";
import { initializeEscrow } from "./handlers/escrowHandler.js";
import { startEscrowMonitor } from "./services/monitor.js";
import { userMiddleware } from "./middlewares/auth.js";
import {
  claimCommand,
  fiatsentCommand,
  releaseCommand,
  cancelCommand,
  listOrdersCommand,
  disputeCommand,
  takeDisputeCommand,
  settleCommand,
  helpCommand,
  setlangCommand,
  feesCommand,
} from "./commands/index.js";
import {
  claimPasswordStep,
  setPassStep,
  claimRefundAddressStep,
} from "./steps/index.js";
import { resolveDispute } from "./handlers/disputeHandler.js";
import { handleOrderCancelFromCommand } from "./commands/cancel.js";

const bot = new Telegraf<BotContext>(process.env.BOT_TOKEN!);

bot.use(
  session({ defaultSession: (): SessionData => ({ step: "IDLE", draft: {} }) }),
);
bot.use(userMiddleware);

bot.command("buy", (ctx) => startOrderWizard(ctx, "BUY"));
bot.command("sell", (ctx) => startOrderWizard(ctx, "SELL"));
bot.command("exit", (ctx) => cancelWizard(ctx));
bot.command("setpass", async (ctx) => {
  if (ctx.user.pubkey !== null) return ctx.reply(ctx.dict.passwordAlreadySet);
  ctx.session.step = "SET_PASS";
  await ctx.reply(ctx.dict.promptPassword, { parse_mode: "Markdown" });
});

bot.command("claim", claimCommand);
bot.command("fiatsent", fiatsentCommand);
bot.command("release", releaseCommand);
bot.command("cancel", cancelCommand);
bot.command("listorders", listOrdersCommand);
bot.command("dispute", disputeCommand);
bot.command("takedispute", takeDisputeCommand);
bot.command("settle", settleCommand);
bot.command("help", helpCommand);
bot.command("setlang", setlangCommand);
bot.command("fees", feesCommand);

bot.on("callback_query", async (ctx, next) => {
  const query = ctx.callbackQuery as { data?: string };
  const data = query?.data;

  if (!data) return next();

  if (data.startsWith("margin_")) {
    if (!ctx.session.draft.amount) return; // Es posible que haya presionado el botón de un mensaje pasado.
    return handleWizardAction(ctx);
  }

  if (data.startsWith("take_order_")) {
    const orderId = data.replace("take_order_", "");
    return handleTakeOrder(ctx, orderId);
  }

  if (data.startsWith("taker_yes_")) {
    return handleTakerConfirm(ctx, data.replace("taker_yes_", ""));
  }

  if (data.startsWith("maker_yes_")) {
    return handleMakerConfirm(ctx, data.replace("maker_yes_", ""));
  }
  if (data.startsWith("taker_cancel_order_")) {
    const orderId = data.replace("taker_cancel_order_", "");
    return handleOrderCancelledRepublish(ctx, orderId);
  }

  if (data.startsWith("cancelCommand_")) {
    const orderId = data.replace("cancelCommand_", "");
    try {
      await ctx.editMessageReplyMarkup(undefined);
    } catch (e) {}
    return handleOrderCancelFromCommand(ctx, orderId);
  }

  if (data.startsWith("maker_deny_")) {
    const orderId = data.replace("maker_deny_", "");
    const order = await getOrder(orderId);
    if (!order) return;

    const didCancel = await tryTransitionOrderStatus(
      orderId,
      ["WAITING_MAKER_CONFIRMATION"],
      "CANCELLED",
    );
    if (!didCancel) {
      try {
        await ctx.editMessageReplyMarkup(undefined);
      } catch (e) {}
      return ctx.answerCbQuery(ctx.dict.cancelNotAllowed, { show_alert: true });
    }

    await ctx.editMessageText(ctx.dict.orderCancelled);

    if (order.takerId) {
      const taker = await getUser(order.takerId);
      const takerDict = dictionaries[(taker?.language as Language) || "es"];
      await ctx.telegram.sendMessage(
        order.takerId,
        takerDict.counterpartyCanceledDeleted(orderId),
        { parse_mode: "Markdown" },
      );
    }
    return;
  }

  if (data.startsWith("settle_buyer_")) {
    return resolveDispute(ctx, data.replace("settle_buyer_", ""), "BUYER");
  }
  if (data.startsWith("settle_seller_")) {
    return resolveDispute(ctx, data.replace("settle_seller_", ""), "SELLER");
  }
  if (data.startsWith("settle_refund_")) {
    return resolveDispute(ctx, data.replace("settle_refund_", ""), "REFUND");
  }

  return next();
});

bot.start(async (ctx) => {
  await ctx.reply(t("es", "welcome"), { parse_mode: "Markdown" });
});

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
    if (!order) return next();

    const [minStr, maxStr] = order.amountFiat.split("-");
    const min = parseFloat(minStr!);
    const max = parseFloat(maxStr!);
    const inputAmount = parseFloat(text.replace(",", "."));

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

    return proceedAfterTakerAmount(ctx, order);
  }

  const orderId = ctx.session.awaitingAddressForOrder;

  if (orderId) {
    const address = ctx.message.text.trim();
    const order = await getOrder(orderId);

    if (!order) return next();

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

    if (order.status === "WAITING_TAKER_CONFIRMATION") {
      await ctx.reply(dict.waitMaker, { parse_mode: "Markdown" });
      await notifyMakerForConfirmation(ctx, order);
    } else if (order.status === "WAITING_MAKER_CONFIRMATION") {
      await ctx.reply(dict.waitTaker, { parse_mode: "Markdown" });
      await db
        .update(orders)
        .set({ status: "WAITING_ESCROW" })
        .where(eq(orders.id, orderId));

      await initializeEscrow(ctx, order.id);
    }
    return;
  }

  return next();
});

bot.catch((err, ctx) => {
  console.error(`Error en actualización ${ctx.update.update_id}:`, err);
});

startEscrowMonitor(bot);
bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
