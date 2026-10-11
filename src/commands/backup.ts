import { Markup } from "telegraf";
import type { CommandContext } from "../types.js";

export async function backupCommand(ctx: CommandContext) {
  if (ctx.chat.type !== "private") {
    return ctx.reply(ctx.dict.backupPrivateOnly);
  }

  await ctx.reply(ctx.dict.backupMenuText, {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard([
      [Markup.button.callback(ctx.dict.btnBackupUser, "backup_user")],
      [Markup.button.callback(ctx.dict.btnBackupContract, "backup_orders_list")],
      [Markup.button.callback(ctx.dict.btnCancel, "cancel_action")]
    ])
  });
}