import { eq, sql } from "drizzle-orm";
import { db } from "./index.js";
import { users } from "./schema.js";

export async function getUser(telegramId: number) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.telegramId, telegramId))
    .limit(1);
  return result[0];
}

export async function ensureUser(telegramId: number, username: string) {
  await db
    .insert(users)
    .values({ telegramId, language: "es", username })
    .onDuplicateKeyUpdate({
      set: { username: sql`VALUES(username)` },
    });

  return await getUser(telegramId);
}

export async function updateUserLanguage(
  telegramId: number,
  lang: "es" | "en",
) {
  await db
    .update(users)
    .set({ language: lang })
    .where(eq(users.telegramId, telegramId));
}
