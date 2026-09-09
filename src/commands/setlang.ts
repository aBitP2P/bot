import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { dictionaries, getLocalesList, localeData, type Language } from "../locales/index.js";
import type { CommandContext } from "../types.js";

export async function setlangCommand(ctx: CommandContext) {
  const dict = ctx.dict;
  const args = ctx.message.text.split(" ");
  const localesList = getLocalesList();
  if (args.length < 2 || args[1]?.length !== 2)
    return ctx.reply(dict.invalidLanguage + localesList, { parse_mode: "Markdown" });

  const lang = args[1].toUpperCase();
  if (!localeData[lang as keyof typeof localeData]) return ctx.reply(dict.invalidLanguage + localesList, { parse_mode: "Markdown" });

  await db.update(users).set({ language: lang.toLowerCase() }).where(eq(users.telegramId, ctx.user.telegramId));

  ctx.reply(dictionaries[lang.toLowerCase() as Language].languageUpdateSuccess)
}