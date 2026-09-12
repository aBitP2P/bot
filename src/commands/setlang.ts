import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { dictionaries, LocaleData, type Language } from "../locales/index.js";
import type { CallbackContext, CommandContext } from "../types.js";

export async function setlangCommand(ctx: CommandContext) {
  const buttons = Object.entries(LocaleData).map(([code, data]) => ({
    text: `${data.emoji} ${data.label}`,
    callback_data: `setlang_${code.toLowerCase()}`,
  }));

  const inline_keyboard = [];
  for (let i = 0; i < buttons.length; i += 2) {
    inline_keyboard.push(buttons.slice(i, i + 2));
  }

  await ctx.reply(ctx.dict.selectLanguage, {
    reply_markup: {
      inline_keyboard,
    },
  });
}

export async function handleSetLangAction(ctx: CallbackContext) {
  const callbackQuery = ctx.callbackQuery as { data?: string };
  if (!callbackQuery?.data?.startsWith("setlang_")) return;

  const userId = ctx.from?.id;
  if (!userId) return;

  const langCode = callbackQuery.data.replace("setlang_", "").toUpperCase();

  if (!LocaleData[langCode as keyof typeof LocaleData]) {
    await ctx.answerCbQuery(ctx.dict.invalidLanguage);
    return;
  }

  await db
    .update(users)
    .set({ language: langCode.toLowerCase() })
    .where(eq(users.telegramId, userId));

  const lang = langCode.toLowerCase() as Language;
  
  await ctx.answerCbQuery();

  await ctx.editMessageText(dictionaries[lang].languageUpdateSuccess, {
    parse_mode: "Markdown"
  });
}