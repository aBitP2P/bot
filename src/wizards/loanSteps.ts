import { Markup } from "telegraf";
import type { BotContext } from "../types.js";
import type { InlineKeyboardMarkup } from "telegraf/types";

export function processLoanAPR(ctx: BotContext): {
  success: boolean;
  error?: string;
  data?: { keyboard: Markup.Markup<InlineKeyboardMarkup>; apr: number };
} {
  const cleanAprText = ctx.text!.replace("%", "");
  const apr = parseFloat(cleanAprText);

  if (isNaN(apr) || apr <= 0 || apr > 100)
    return { success: false, error: ctx.dict.invalidLoanAPR };

  const ltvKeyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback("30%", "ltv_30"),
      Markup.button.callback("40%", "ltv_40"),
      Markup.button.callback("50%", "ltv_50"),
    ],
    [
      Markup.button.callback("60%", "ltv_60"),
      Markup.button.callback("70%", "ltv_70"),
      Markup.button.callback("80%", "ltv_80"),
    ],
  ]);
  return { success: true, data: { keyboard: ltvKeyboard, apr } };
}

export function processLoanDuration(ctx: BotContext): {
  success: boolean;
  error?: string;
  duration?: string;
} {
  const text = ctx.text!;
  if (!text || !/^(\d+)(-(\d+))?$/.test(text))
    return { success: false, error: ctx.dict.invalidLoanDuration };

  const parts = text.split("-");
  const durations = parts.map((p) => parseInt(p, 10));

  if (durations.some((d) => isNaN(d) || d < 1 || d > 120))
    return { success: false, error: ctx.dict.invalidLoanDuration };

  let duration;

  const [dMin, dMax] = durations as [number, number?];
  if (dMax !== undefined) {
    if (dMin > dMax) return { success: false };
    if (dMin === dMax) {
      duration = `${dMin}`;
    } else {
      duration = `${dMin}-${dMax}`;
    }
  } else {
    duration = `${dMin}`;
  }
  return { success: true, duration };
}
