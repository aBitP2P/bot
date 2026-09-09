import type { CommandContext } from "../types.js";

export async function helpCommand(ctx: CommandContext) {
  return ctx.reply(ctx.dict.helpMessage(), { parse_mode: "Markdown" });
}