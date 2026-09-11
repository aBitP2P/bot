import { eq } from "drizzle-orm";
import type { CommandContext } from "../types.js";
import { generateWif, getPubkeyFromWif } from "../core/bitcoin/index.js";
import { encryptData } from "../utils/crypto.js";
import { users } from "../db/schema.js";
import { db } from "../db/index.js";

export async function setPassStep(ctx: CommandContext) {
  const password = ctx.message.text;
  const userId = ctx.from.id;

  const wif = generateWif();
  const pubkey = getPubkeyFromWif(wif);
  const encryptedWif = encryptData(wif, password);

  await db.update(users).set({ encryptedWif, pubkey }).where(eq(users.telegramId, userId));

  ctx.session.step = 'IDLE';
  ctx.dict;

  try { await ctx.deleteMessage(); } catch (e) { console.error('No se pudo borrar el msj de la contraseña'); }

  return ctx.reply(ctx.dict.passwordSetSuccess, { parse_mode: 'Markdown' });
}