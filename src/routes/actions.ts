import type { Telegraf } from "telegraf";
import { resolveDispute } from "../handlers/disputeHandler.js";
import {
  handleMakerConfirm,
  handleOrderCancelledRepublish,
  handleTakeOrder,
  handleTakerConfirm,
} from "../handlers/orderHandler.js";
import type { BotContext } from "../types.js";
import { getOrder, tryTransitionOrderStatus } from "../db/orders.js";
import { OrderStatus } from "../shared/constants.js";
import { getUser } from "../db/users.js";
import { getUserDict } from "../locales/index.js";
import { safeRemoveMarkup } from "../utils/telegram.js";
import { routeCancel } from "../commands/cancel.js";
import { markAsFiatSent } from "../commands/fiatsent.js";
import { askReleaseConfirmation, doFundsRelease } from "../commands/release.js";
import { initiateClaim } from "../commands/claim.js";
import { handleSetLangAction } from "../commands/setlang.js";
import { handleLoanWizardAction } from "../wizards/loanWizard.js";
import { handleMarginAction } from "../wizards/orderWizard.js";
import { handleRating } from "../handlers/ratingHandler.js";
import { users } from "../db/schema.js";
import { db } from "../db/index.js";
import { eq } from "drizzle-orm";
import {
  handleLoanCancelledRepublish,
  handleLoanMakerConfirm,
  handleLoanTakerConfirm,
  handleTakeLoan,
  proceedToLoanMakerConfirmation,
} from "../handlers/loanHandler.js";

export function setupActions(bot: Telegraf<BotContext>) {
  bot.action(/^take_loan_(.+)$/, (ctx) => handleTakeLoan(ctx, ctx.match[1]!));
  bot.action(/^taker_yes_loan_(.+)$/, (ctx) =>
    handleLoanTakerConfirm(ctx, ctx.match[1]!),
  );

  bot.action(/^taker_final_yes_loan_(.+)$/, (ctx) =>
    proceedToLoanMakerConfirmation(ctx, ctx.match[1]!),
  );

  bot.action(/^maker_yes_loan_(.+)$/, (ctx) =>
    handleLoanMakerConfirm(ctx, ctx.match[1]!),
  );
  bot.action(/^taker_cancel_order_loan_(.+)$/, (ctx) =>
    handleLoanCancelledRepublish(ctx, ctx.match[1]!),
  );
  bot.action(/^take_order_(.+)$/, (ctx) => handleTakeOrder(ctx, ctx.match[1]!));
  bot.action(/^taker_yes_(.+)$/, (ctx) =>
    handleTakerConfirm(ctx, ctx.match[1]!),
  );
  bot.action(/^maker_yes_(.+)$/, (ctx) =>
    handleMakerConfirm(ctx, ctx.match[1]!),
  );
  bot.action(/^taker_cancel_order_(.+)$/, (ctx) =>
    handleOrderCancelledRepublish(ctx, ctx.match[1]!),
  );

  bot.action(/^maker_deny_(.+)$/, async (ctx) => {
    const orderId = ctx.match[1]!;
    const order = await getOrder(orderId);
    if (!order) return;

    const didCancel = await tryTransitionOrderStatus(
      orderId,
      [OrderStatus.WaitingMakerConfirmation],
      OrderStatus.Cancelled,
    );
    if (!didCancel) {
      await safeRemoveMarkup(ctx);
      return ctx.answerCbQuery(ctx.dict.cancelNotAllowed, { show_alert: true });
    }

    await ctx.editMessageText(ctx.dict.orderCancelled);

    if (order.takerId) {
      const taker = await getUser(order.takerId);
      const takerDict = getUserDict(taker?.language);
      await ctx.telegram.sendMessage(
        order.takerId,
        takerDict.counterpartyCanceledDeleted(orderId),
        { parse_mode: "Markdown" },
      );
    }
  });

  bot.action(/^cancelCommand_(.+)$/, async (ctx) => {
    await safeRemoveMarkup(ctx);
    return routeCancel(ctx, ctx.match[1]!);
  });

  bot.action(/^fiatsentCommand_(.+)$/, (ctx) =>
    markAsFiatSent(ctx, ctx.match[1]!),
  );
  bot.action(/^releaseCommand_(.+)$/, (ctx) =>
    askReleaseConfirmation(ctx, ctx.match[1]!),
  );
  bot.action(/^confirmRelease_(.+)$/, async (ctx) => {
    const orderId = ctx.match[1]!;
    const order = await getOrder(orderId);
    if (!order)
      return ctx.answerCbQuery(ctx.dict.orderNotFound, { show_alert: true });
    return doFundsRelease(ctx, order);
  });
  bot.action(/^cancelRelease$/, (ctx) =>
    ctx.editMessageText(ctx.dict.cancelled),
  );
  bot.action(/^claimCommand_(.+)$/, (ctx) => initiateClaim(ctx, ctx.match[1]!));
  bot.action(/^setlang_(.+)$/, (ctx) => handleSetLangAction(ctx));

  bot.action(/^setfee_default$/, async (ctx) => {
    await db
      .update(users)
      .set({ customFee: null })
      .where(eq(users.telegramId, ctx.from!.id));
    await ctx.answerCbQuery();
    await ctx.editMessageText(ctx.dict.feeResetSuccess, {
      parse_mode: "Markdown",
    });
  });

  bot.action(/^ltv_(.+)$/, (ctx) => handleLoanWizardAction(ctx));
  bot.action(/^margin_(.+)$/, (ctx) => handleMarginAction(ctx));

  bot.action(/^rate_(\d+)_(.+)$/, (ctx) => {
    const stars = parseInt(ctx.match[1]!);
    const orderId = ctx.match[2]!;
    return handleRating(ctx, { orderId, stars, raterId: ctx.from!.id });
  });

  bot.action(/^settle_buyer_(.+)$/, (ctx) =>
    resolveDispute(ctx, ctx.match[1]!, "BUYER"),
  );
  bot.action(/^settle_seller_(.+)$/, (ctx) =>
    resolveDispute(ctx, ctx.match[1]!, "SELLER"),
  );
  bot.action(/^settle_refund_(.+)$/, (ctx) =>
    resolveDispute(ctx, ctx.match[1]!, "REFUND"),
  );

  bot.on("callback_query", (ctx) => ctx.answerCbQuery());
}
