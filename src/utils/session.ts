import type { BotContext } from "../types.js";

/** Reinicia la sesión al estado inicial (sin wizard ni datos pendientes). */
export function resetSession(ctx: BotContext) {
  ctx.session = { step: "IDLE", draft: {} };
}
