import type { Telegraf } from "telegraf";
import type { BotContext, CallbackContext } from "../types.js";
import { handleWizardAction } from "../wizards/orderWizard.js";
import {
  handleMakerConfirm,
  handleOrderCancelledRepublish,
  handleTakeOrder,
  handleTakerConfirm,
} from "../handlers/orderHandler.js";
import { handleSetLangAction } from "../commands/setlang.js";
import { safeRemoveMarkup } from "../utils/telegram.js";
import { handleOrderCancelFromCommand } from "../commands/cancel.js";
import { handleOrderBackup } from "../commands/backup.js";
import { markAsFiatSent } from "../commands/fiatsent.js";
import { askReleaseConfirmation, doFundsRelease } from "../commands/release.js";
import { initiateClaim } from "../commands/claim.js";
import { getOrder, tryTransitionOrderStatus } from "../db/orders.js";
import { resolveDispute } from "../handlers/disputeHandler.js";
import { handleRating } from "../handlers/ratingHandler.js";
import { OrderStatus } from "../shared/constants.js";
import { notifyUser } from "../utils/telegram.js";
import { resetFeeToDefault } from "../commands/setfee.js";

type Handler = (ctx: CallbackContext, arg: string) => unknown;


/** Prefijo del callback_data -> acción. Se busca en orden; el primero que coincide gana. */
const routes: Array<[string, Handler]> = [
  [
    "margin_",
    (ctx) => {
      // Es posible que haya presionado el botón de un mensaje pasado.
      if (!(ctx as BotContext).session.draft.amount) return;
      return handleWizardAction(ctx as BotContext);
    },
  ],
  ["take_order_", (ctx, id) => handleTakeOrder(ctx, id)],
  ["taker_yes_", (ctx, id) => handleTakerConfirm(ctx, id)],
  ["maker_yes_", (ctx, id) => handleMakerConfirm(ctx, id)],
  ["taker_cancel_order_", (ctx, id) => handleOrderCancelledRepublish(ctx, id)],
  ["setlang_", (ctx) => handleSetLangAction(ctx)],
  [
    "cancelCommand_",
    async (ctx, id) => {
      await safeRemoveMarkup(ctx as BotContext);
      return handleOrderCancelFromCommand(ctx, id);
    },
  ],
  [
    "backupCommand_",
    async (ctx, id) => {
      await safeRemoveMarkup(ctx as BotContext);
      return handleOrderBackup(ctx, id);
    },
  ],
  ["fiatsentCommand_", (ctx, id) => markAsFiatSent(ctx, id)],
  ["releaseCommand_", (ctx, id) => askReleaseConfirmation(ctx, id)],
  [
    "confirmRelease_",
    async (ctx, id) => {
      const order = await getOrder(id);
      if (!order)
        return ctx.answerCbQuery(ctx.dict.orderNotFound, { show_alert: true });
      await doFundsRelease(ctx, order);
    },
  ],
  ["cancelRelease", (ctx) => ctx.editMessageText(ctx.dict.cancelled)],
  ["claimCommand_", (ctx, id) => initiateClaim(ctx, id)],
  ["setfee_default", (ctx) => resetFeeToDefault(ctx)],
  ["maker_deny_", (ctx, id) => makerDeny(ctx, id)],
  ["rate_", (ctx, arg) => rate(ctx, arg)],
  ["settle_buyer_", (ctx, id) => resolveDispute(ctx, id, "BUYER")],
  ["settle_seller_", (ctx, id) => resolveDispute(ctx, id, "SELLER")],
  ["settle_refund_", (ctx, id) => resolveDispute(ctx, id, "REFUND")],
];

async function makerDeny(ctx: CallbackContext, orderId: string) {
  const order = await getOrder(orderId);
  if (!order) return;

  const didCancel = await tryTransitionOrderStatus(
    orderId,
    [OrderStatus.WaitingMakerConfirmation],
    OrderStatus.Cancelled,
  );
  if (!didCancel) {
    await safeRemoveMarkup(ctx as BotContext);
    return ctx.answerCbQuery(ctx.dict.cancelNotAllowed, { show_alert: true });
  }

  await ctx.editMessageText(ctx.dict.orderCancelled);

  if (order.takerId) {
    await notifyUser(ctx, order.takerId, (d) =>
      d.counterpartyCanceledDeleted(orderId),
    );
  }
}

/** arg = "<stars>_<orderId>" (el prefijo "rate_" ya se quitó). */
function rate(ctx: CallbackContext, arg: string) {
  const parts = arg.split("_");
  if (parts.length < 2) return;
  return handleRating(ctx, {
    orderId: parts[1]!,
    stars: parseInt(parts[0]!),
    raterId: ctx.from.id,
  });
}

export function registerCallbacks(bot: Telegraf<BotContext>) {
  bot.on("callback_query", async (ctx, next) => {
    const data = (ctx.callbackQuery as { data?: string })?.data;
    if (!data) return next();

    const route = routes.find(([prefix]) => data.startsWith(prefix));
    if (!route) return next();

    const [prefix, handler] = route;
    return handler(ctx, data.slice(prefix.length));
  });
}
