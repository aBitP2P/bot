import type { CommandContext } from "../types.js";
import { getLiveMinerFeeList } from "../core/bitcoin/index.js";
import { FEE_TIERS } from "../config/fees.js";

export async function feesCommand(ctx: CommandContext) {
  const list = await getLiveMinerFeeList();
  if (!list) return await ctx.reply(ctx.dict.couldNotFetchFees);

  const highTier = FEE_TIERS.find((t) => t.maxSats === Infinity)?.feePercent ?? 0.6;
  return await ctx.reply(
    ctx.dict.feesList(`0% (<100k) / ${highTier}`, list, ctx.user.customFee),
    { parse_mode: "Markdown" },
  );
}