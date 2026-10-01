import "dotenv/config";
import { Telegraf, session } from "telegraf";
import { type BotContext, type SessionData } from "./types.js";
import {
  startEscrowMonitor,
  startOrderTimeoutsMonitor,
  startLoanEscrowMonitor
} from "./services/index.js";
import { userMiddleware } from "./middlewares/auth.js";
import { Strings } from "./shared/constants.js";
import { setupActions } from "./routes/actions.js";
import { setupCommands } from "./routes/commands.js";
import { setupMessages } from "./routes/messages.js";

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
    ctx.session = { step: "IDLE", draft: {} };
  }
  return next();
});

setupMessages(bot);
setupCommands(bot);
setupActions(bot);

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

bot.catch((err, ctx) => {
  console.error(`Error en actualización ${ctx.update.update_id}:`, err);
});

startEscrowMonitor(bot);
startOrderTimeoutsMonitor(bot);

startLoanEscrowMonitor(bot);
bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
