import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { loans, orders } from "../db/schema.js";
import type { CommandContext, LoanRecord, OrderRecord } from "../types.js";
import { isValidAddress } from "../core/bitcoin/index.js";
import { startClaimPasswordFlow } from "../commands/claim.js";
import { getContract } from "../db/contracts.js";

export async function claimRefundAddressStep(ctx: CommandContext) {
  const address = ctx.message.text.trim();
  const contractId = ctx.session.claimOrderId;

  const contract = contractId ? await getContract(contractId) : undefined;

  if (!contract) {
    ctx.session.step = "IDLE";
    ctx.session.claimOrderId = undefined;
    return ctx.reply(ctx.dict.orderNotFound);
  }

  if (!isValidAddress(address)) {
    return ctx.reply(ctx.dict.invalidRefundAddress, { parse_mode: "Markdown" });
  }

  if (contract.isLoan) {
    const isLender = contract.sellerOrLenderId === ctx.from.id;
    if (isLender) {
      await db
        .update(loans)
        .set({ lenderAddress: address })
        .where(eq(loans.id, contract.data.id));
      (contract.data as LoanRecord).lenderAddress = address;
    } else {
      await db
        .update(loans)
        .set({ borrowerAddress: address })
        .where(eq(loans.id, contract.data.id));
      (contract.data as LoanRecord).borrowerAddress = address;
    }

    (contract.data as LoanRecord).borrowerAddress = address;
  } else {
    await db
      .update(orders)
      .set({ refundAddress: address })
      .where(eq(orders.id, contract.data.id));

    (contract.data as OrderRecord).refundAddress = address;
  }

  return startClaimPasswordFlow(ctx, contract, address);
}
