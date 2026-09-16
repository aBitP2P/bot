import type { CommandContext } from "../types.js";
import { getLiveMinerFeeList } from "../core/bitcoin/index.js";


export async function feesCommand(ctx: CommandContext) {
  const list = await getLiveMinerFeeList();
  if (!list) return await ctx.reply(ctx.dict.couldNotFetchFees);

  return await ctx.reply(ctx.dict.feesList(process.env.BOT_FEE!, list, ctx.user.customFee), { parse_mode: "Markdown" });
}