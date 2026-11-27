import type { CommandContext } from "../types.js";
import { getLiveMinerFeeList } from "../core/bitcoin/index.js";
import { BOT_FEE_PERCENT } from "../config/fees.js";

export async function feesCommand(ctx: CommandContext) {
  const list = await getLiveMinerFeeList();
  if (!list) return await ctx.reply(ctx.dict.couldNotFetchFees);

  return await ctx.reply(
    ctx.dict.feesList(String(BOT_FEE_PERCENT), list, ctx.user.customFee),
    { parse_mode: "Markdown" },
  );
}