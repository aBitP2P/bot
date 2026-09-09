import type { CommandContext } from "../types.js";
import { settleCommand as settleHandler } from "../handlers/disputeHandler.js";

export async function settleCommand(ctx: CommandContext) {
  const dict = ctx.dict;
  const args = ctx.message.text.split(" ");
  if (args.length < 2)
    return ctx.reply(dict.commandUsage("/settle <ORDER_ID>"), {
      parse_mode: "Markdown",
    });

  const orderId = args[1] as string;
  return await settleHandler(ctx, orderId);
}
