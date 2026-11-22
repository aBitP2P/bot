import { and, eq, isNull } from "drizzle-orm";
import type { CommandContext } from "../types.js";
import { generateWallet } from "../core/bitcoin/index.js";
import { encryptData } from "../utils/crypto.js";
import { users } from "../db/schema.js";
import { db } from "../db/index.js";
import { safeDeleteMsg } from "../utils/telegram.js";
import type { ResultSetHeader } from "mysql2";

export async function setPassStep(ctx: CommandContext) {
  const password = ctx.message.text;
  const userId = ctx.from.id;

  await safeDeleteMsg(ctx);

  if (!ctx.session.passwordToConfirm) {
    if (password.length < 8) {
      await ctx.reply(ctx.dict.unsafePassword, { parse_mode: "Markdown" });
      return;
    }
    ctx.session.passwordToConfirm = password;
    await ctx.reply(ctx.dict.confirmPassword);
    return;
  }

  if (password !== ctx.session.passwordToConfirm) {
    await ctx.reply(ctx.dict.passwordsDoNotMatch);
    ctx.session = { step: "IDLE", draft: {} };
    return;
  }

  const wallet = generateWallet();
  const encryptedMnemonic = encryptData(wallet.mnemonic, password);

  const [res] = (await db
    .update(users)
    .set({ encryptedMnemonic, xpub: wallet.xpub, fingerprint: wallet.fingerprint })
    .where(and(isNull(users.xpub), eq(users.telegramId, userId)))) as unknown as [ResultSetHeader];

  ctx.session.step = "IDLE";
  ctx.session.passwordToConfirm = undefined;

  if (res.affectedRows === 0) {
    await ctx.reply(ctx.dict.passwordAlreadySet);
    return;
  }

  await ctx.reply(ctx.dict.passwordSetSuccess, { parse_mode: "Markdown" });
  await ctx.reply(ctx.dict.pleaseSaveMnemonic(wallet.mnemonic), { parse_mode: "Markdown" });
}
