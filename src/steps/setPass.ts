import { eq } from "drizzle-orm";
import type { CommandContext } from "../types.js";
import { generateWif, getPubkeyFromWif } from "../core/bitcoin/index.js";
import { encryptData } from "../utils/crypto.js";
import { users } from "../db/schema.js";
import { db } from "../db/index.js";
import { safeDeleteMsg } from "../utils/telegram.js";

export async function setPassStep(ctx: CommandContext) {
  const password = ctx.message.text;
  const userId = ctx.from.id;

  await safeDeleteMsg(ctx);

  if (!ctx.session.passwordToConfirm) {
    ctx.session.passwordToConfirm = password;
    await ctx.reply(ctx.dict.confirmPassword);
    return;
  }

  if (password !== ctx.session.passwordToConfirm) {
    await ctx.reply(ctx.dict.passwordsDoNotMatch);
    ctx.session = { step: "IDLE", draft: {} };
    return;
  }

  const wif = generateWif();
  const pubkey = getPubkeyFromWif(wif);
  const encryptedWif = encryptData(wif, password);

  await db
    .update(users)
    .set({ encryptedWif, pubkey })
    .where(eq(users.telegramId, userId));

  ctx.session.step = "IDLE";

  return ctx.reply(ctx.dict.passwordSetSuccess, { parse_mode: "Markdown" });
}
