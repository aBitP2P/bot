import type { CommandContext } from "../types.js";
import { takeDispute } from "../handlers/disputeHandler.js";

export async function takeDisputeCommand(ctx: CommandContext) {
  const dict = ctx.dict;
  const args = ctx.message.text.split(" ");
  if (args.length < 2)
    return ctx.reply(dict.commandUsage("/takedispute <ORDER_ID>"), {
      parse_mode: "Markdown",
    });

  const orderId = args[1] as string;
  return takeDispute(ctx, orderId);
}
