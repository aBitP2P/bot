import type { Telegraf } from "telegraf";
import type { BotContext, CallbackContext, Dictionary, UserRecord } from "../types.js";
import { getUser } from "../db/users.js";
import { getUserDict } from "../locales/index.js";

export async function safeDeleteMsg(ctx: BotContext | CallbackContext) {
  if ("callbackQuery" in ctx && ctx.callbackQuery) {
    await ctx.deleteMessage().catch(() => {});
  } else if (ctx.message) {
    await ctx.deleteMessage(ctx.message.message_id).catch(() => {});
  }
}

export async function safeRemoveMarkup(ctx: BotContext) {
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});
}

export async function safeNotify(
  bot: Telegraf<BotContext>, 
  userOrId: number | UserRecord | undefined, 
  messageBuilder: (dict: Dictionary) => string
) {
  if (!userOrId) return;
  const user = typeof userOrId === "number" ? await getUser(userOrId) : userOrId;
  if (!user) return;
  
  const dict = getUserDict(user.language); 
  await bot.telegram.sendMessage(user.telegramId, messageBuilder(dict), { parse_mode: "Markdown" }).catch(() => {});
  await new Promise(resolve => setTimeout(resolve, 50))
}