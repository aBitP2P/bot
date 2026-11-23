import { Markup } from "telegraf";
import { clearExternalPsbtsForUser } from "../db/orders.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { type BotContext, type CallbackContext, type CommandContext } from "../types.js";

async function applyCustomFee(ctx: BotContext, customFee: number | null) {
  await db
    .update(users)
    .set({ customFee })
    .where(eq(users.telegramId, ctx.from!.id));

  await clearExternalPsbtsForUser(ctx.from!.id);
}

export async function setFeeCommand(ctx: CommandContext) {
  const defaultFeeKeyboard = Markup.inlineKeyboard([
    Markup.button.callback(ctx.dict.resetFeeButton, "setfee_default"),
  ]);
  const args = ctx.message.text.trim().split(/\s+/);
  if (args.length < 2) {
    return ctx.reply(
      ctx.dict.commandUsage("/setfee <sats/vbyte>", "/setfee 1"),
      { parse_mode: "Markdown", ...defaultFeeKeyboard },
    );
  }

  const input = args[1]!.replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(input)) {
    return ctx.reply(
      ctx.dict.commandUsage("/setfee <sats/vbyte>", "/setfee 1"),
      { parse_mode: "Markdown", ...defaultFeeKeyboard },
    );
  }

  const newFee = Number(input);
  if (newFee < 1 || newFee > 500) {
    return ctx.reply(ctx.dict.invalidCustomFee);
  }

  await applyCustomFee(ctx, newFee);

  return ctx.reply(ctx.dict.customFeeChanged(newFee));
}

export async function resetFeeToDefault(ctx: CallbackContext) {
  await applyCustomFee(ctx, null);
  await ctx.answerCbQuery();
  await ctx.editMessageText(ctx.dict.feeResetSuccess, {
    parse_mode: "Markdown",
  });
}
