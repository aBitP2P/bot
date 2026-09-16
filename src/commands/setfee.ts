import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import type { CommandContext } from "../types.js";
import { Markup } from "telegraf";

export async function setFeeCommand(ctx: CommandContext) {
  const defaultFeeKeyboard = Markup.inlineKeyboard([
    Markup.button.callback(ctx.dict.resetFeeButton, "setfee_default"),
  ]);
  const args = ctx.message.text.split(" ");
  if (args.length < 2)
    return ctx.reply(
      ctx.dict.commandUsage("/setfee <sats/vbyte>", "/setfee 1"),
      { parse_mode: "Markdown", ...defaultFeeKeyboard },
    );

  const input = args[1]!.replace(",", ".");
  const newFee = parseFloat(input);
  if (isNaN(newFee))
    return ctx.reply(
      ctx.dict.commandUsage("/setfee <sats/vbyte>", "/setfee 1"),
      { parse_mode: "Markdown", ...defaultFeeKeyboard },
    );

  const decimalPart = newFee.toString().split(".")[1];
  if (newFee < 0.8 || (decimalPart && decimalPart.length > 2) || newFee > 20)
    return ctx.reply(ctx.dict.invalidCustomFee);

  await db
    .update(users)
    .set({
      customFee: newFee,
    })
    .where(eq(users.telegramId, ctx.from.id));

  return ctx.reply(ctx.dict.customFeeChanged(newFee));
}
