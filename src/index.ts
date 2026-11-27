import "dotenv/config";
import { Telegraf, session } from "telegraf";
import { type BotContext, type SessionData } from "./types.js";
import {
  resumeHoldInvoiceWatches,
  startEscrowMonitor,
  startOrderTimeoutsMonitor,
} from "./services/monitor.js";
import { userMiddleware } from "./middlewares/auth.js";
import { Strings } from "./shared/constants.js";
import { resetSession } from "./utils/session.js";
import { registerCommands } from "./bot/commands.js";
import { registerCallbacks } from "./bot/callbacks.js";
import { registerClaimActions } from "./bot/claimActions.js";
import { registerTextHandler } from "./bot/textHandler.js";
import { testLndConnection } from "./core/lightning/client.js";

const bot = new Telegraf<BotContext>(process.env.BOT_TOKEN!);

bot.use(
  session({ defaultSession: (): SessionData => ({ step: "IDLE", draft: {} }) }),
);
bot.use(userMiddleware);
bot.use((ctx, next) => {
  if (
    ctx.message &&
    "text" in ctx.message &&
    ctx.message.text.startsWith("/")
  ) {
    resetSession(ctx);
  }
  return next();
});
registerCommands(bot);
registerClaimActions(bot);

bot.start(async (ctx) => {
  const text =
    `🤖 *¡Bienvenido a aBitP2P! / Welcome to aBitP2P!*\n\n` +
    `🇪🇸 *ESPAÑOL*\n` +
    `⚠️ *Paso 1:* Usa /setpass para configurar tu contraseña y activar tu cuenta.\n` +
    `🌍 *Idioma:* Usa /setlang para cambiar a inglés (u otro idioma).\n` +
    `📚 *Ayuda:* Usa /help para ver los comandos.\n` +
    `📢 *Comunidad:* Chat general ${Strings.GeneralChatTag} | Órdenes ${Strings.OrderChannelTag}\n` +
    `⚡️ *Nota:* Estamos en fase inicial. ¡Publica tus ofertas y ayúdanos a crear liquidez!\n\n` +
    `➖ ➖ ➖ ➖ ➖ ➖ ➖\n\n` +
    `🇬🇧 *ENGLISH*\n` +
    `⚠️ *Step 1:* Use /setpass to set your password and activate your account.\n` +
    `🌍 *Language:* Use /setlang to change the bot's language.\n` +
    `📚 *Help:* Use /help to see all commands.\n` +
    `📢 *Community:* General chat ${Strings.GeneralChatTag} | Orders ${Strings.OrderChannelTag}\n` +
    `⚡️ *Note:* We are in early stages. Place your offers to help us build liquidity!`;

  await ctx.reply(text, { parse_mode: "Markdown" });
});

registerCallbacks(bot);
registerTextHandler(bot);

bot.catch((err, ctx) => {
  console.error(`Error en actualización ${ctx.update.update_id}:`, err);
});

startEscrowMonitor(bot);
startOrderTimeoutsMonitor(bot);
testLndConnection();
resumeHoldInvoiceWatches(bot).catch((err) =>
  console.error("Error al reanudar los hold invoice:", err),
);
bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
