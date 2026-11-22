import { and, eq, inArray, or } from "drizzle-orm";
import { Markup } from "telegraf";
import { db } from "../db/index.js";
import { orders, users } from "../db/schema.js";
import { type CommandContext } from "../types.js";
import { OrderStatus } from "../shared/constants.js";

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

  await db
    .update(users)
    .set({ customFee: newFee })
    .where(eq(users.telegramId, ctx.from.id));

  await db
    .update(orders)
    .set({ externalPsbt: null })
    .where(
      and(
        inArray(orders.status, [OrderStatus.Releasable, OrderStatus.Refundable]),
        or(
          eq(orders.creatorId, ctx.from.id),
          eq(orders.takerId, ctx.from.id),
        ),
      ),
    );

  return ctx.reply(ctx.dict.customFeeChanged(newFee));
}