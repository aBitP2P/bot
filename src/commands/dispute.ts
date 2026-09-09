import type { CommandContext } from "../types.js";
import { openDispute } from "../handlers/disputeHandler.js";

export async function disputeCommand(ctx: CommandContext) {
  const dict = ctx.dict;
  const args = ctx.message.text.split(' ');
  if (args.length < 2) return ctx.reply(dict.commandUsage('/dispute <ORDER_ID>'), { parse_mode: 'Markdown' });

  const orderId = args[1] as string;
  return openDispute(ctx, orderId);
}
