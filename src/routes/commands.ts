import type { Telegraf } from "telegraf";
import type { BotContext, CommandContext } from "../types.js";
import * as wo from "../wizards/orderWizard.js";
import * as wl from "../wizards/loanWizard.js";
import * as c from "../commands/index.js";
import { isAdmin } from "../utils/admin.js";

const betaCommandsEnabled = process.env.ENABLE_BETA_COMMANDS == "true";

function betaGuard(handler: (ctx: any) => Promise<any>) {
  return async (ctx: CommandContext) => {
    if (betaCommandsEnabled || isAdmin(ctx.from.id)) {
      return handler(ctx);
    }
    return; // ignorar
  };
}

export function setupCommands(bot: Telegraf<BotContext>) {
  bot.command("buy", (ctx) => wo.startOrderWizard(ctx, "BUY"));
  bot.command("sell", (ctx) => wo.startOrderWizard(ctx, "SELL"));
  
  bot.command("lend", betaGuard((ctx) => wl.startLoanWizard(ctx, "LEND")));
  bot.command("borrow", betaGuard((ctx) => wl.startLoanWizard(ctx, "BORROW")));
  
  bot.command("exit", (ctx) => wo.cancelWizard(ctx));
  bot.command("setpass", async (ctx) => {
    if (ctx.user.pubkey !== null) return ctx.reply(ctx.dict.passwordAlreadySet);
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
  
  bot.command("repaid", betaGuard(c.repaidCommand));
  bot.command("loanstatus", betaGuard(c.loanStatusCommand));
}
