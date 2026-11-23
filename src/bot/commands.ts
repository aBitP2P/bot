import type { Telegraf } from "telegraf";
import type { BotContext } from "../types.js";
import { cancelWizard, startOrderWizard } from "../wizards/orderWizard.js";
import * as c from "../commands/index.js";

export function registerCommands(bot: Telegraf<BotContext>) {
  bot.command("buy", (ctx) => startOrderWizard(ctx, "BUY"));
  bot.command("sell", (ctx) => startOrderWizard(ctx, "SELL"));
  bot.command("exit", (ctx) => cancelWizard(ctx));
  bot.command("setpass", async (ctx) => {
    if (ctx.user.xpub !== null) return ctx.reply(ctx.dict.passwordAlreadySet);
    ctx.session.step = "SET_PASS";
    await ctx.reply(ctx.dict.promptPassword, { parse_mode: "Markdown" });
  });
  
  bot.command("claim", c.claimCommand);
  bot.command("fiatsent", c.fiatsentCommand);
  bot.command("release", c.releaseCommand);
  bot.command("cancel", c.cancelCommand);
  bot.command("listorders", c.listOrdersCommand);
  bot.command("dispute", c.disputeCommand);
  bot.command("takedispute", c.takeDisputeCommand);
  bot.command("settle", c.settleCommand);
  bot.command("help", c.helpCommand);
  bot.command("setlang", c.setlangCommand);
  bot.command("fees", c.feesCommand);
  bot.command("setfee", c.setFeeCommand);
  bot.command("backup", c.backupCommand);
}