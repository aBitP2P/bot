import { getContract } from "../db/contracts.js";
import type {
  BotContext,
  CallbackContext,
  CommandContext,
  OrderRecord,
  LoanRecord,
} from "../types.js";
import type { UnifiedContract } from "../db/contracts.js";
import {
  getLiveMinerFee,
  checkEscrowFunding,
  DUST_LIMIT,
} from "../core/bitcoin/index.js";
import { OrderStatus, LoanStatus } from "../shared/constants.js";
import { buildOrderSelectKeyboard } from "../shared/keyboards.js";
import { getBotFeePercent } from "../config/fees.js";
import { getUnifiedUserContractsForAction } from "../db/contracts.js";

export async function claimCommand(ctx: CommandContext) {
  const userId = ctx.from.id;
  const dict = ctx.dict;

  const args = ctx.message.text.split(" ");
  if (args.length < 2) {
    const claimableContracts = await getUnifiedUserContractsForAction(
      userId,
      "CLAIM",
    );
    if (claimableContracts.length === 0)
      await ctx.reply(dict.noClaimableOrdersFound, { parse_mode: "Markdown" });
    else
      await ctx.reply(dict.selectClaimableOrder, {
        ...buildOrderSelectKeyboard(claimableContracts, "claimCommand"),
      });
    return;
  }

  const contractId = args[1] as string;
  await initiateClaim(ctx, contractId);
}
export async function initiateClaim(
  ctx: CallbackContext | CommandContext,
  contractId: string,
) {
  const userId = ctx.from.id;
  const dict = ctx.dict;

  const contract = await getContract(contractId);
  if (!contract) return ctx.reply(dict.orderNotFound);

  const isReleasable =
    contract.data.status === OrderStatus.Releasable ||
    contract.data.status === LoanStatus.Releasable;
  const isRefundable =
    contract.data.status === OrderStatus.Refundable ||
    contract.data.status === LoanStatus.Refundable;

  const isFirstLiquidation =
    contract.isLoan && [LoanStatus.Liquidatable, LoanStatus.Expired].includes(contract.data.status! as any);
  const isSecondLiquidation =
    contract.isLoan && contract.data.status === LoanStatus.PartiallyLiquidated;
  const isLiquidation = isFirstLiquidation || isSecondLiquidation;

  if (!isReleasable && !isRefundable && !isLiquidation) {
    return ctx.reply(dict.invalidOrderStatus);
  }

  if (isReleasable) {
    if (userId !== contract.buyerOrBorrowerId) return ctx.reply(dict.onlyBuyer);

    const receivingAddress = contract.isLoan
      ? (contract.data as LoanRecord).borrowerAddress
      : (contract.data as OrderRecord).buyerAddress;

    if (!receivingAddress) {
      ctx.session.step = "AWAITING_CLAIM_ADDRESS";
      ctx.session.claimOrderId = contract.data.id;
      return ctx.reply(dict.askRefundAddress, { parse_mode: "Markdown" });
    }

    return startClaimPasswordFlow(ctx, contract, receivingAddress);
  }

  if (isLiquidation) {
    if (
      userId !== contract.sellerOrLenderId &&
      userId !== contract.buyerOrBorrowerId
    ) {
      return ctx.reply(dict.unauthorizedAccess);
    }

    const receivingAddress =
      userId === contract.sellerOrLenderId
        ? (contract.data as LoanRecord).lenderAddress
        : (contract.data as LoanRecord).borrowerAddress;

    if (!receivingAddress) {
      ctx.session.step = "AWAITING_CLAIM_ADDRESS";
      ctx.session.claimOrderId = contract.data.id;
      return ctx.reply(dict.askRefundAddress, { parse_mode: "Markdown" });
    }

    return startClaimPasswordFlow(ctx, contract, receivingAddress);
  }

  if (userId !== contract.sellerOrLenderId && !contract.isLoan) {
    return ctx.reply(dict.onlySeller);
  }

  const refundAddress = contract.isLoan
    ? (contract.data as LoanRecord).borrowerAddress
    : (contract.data as OrderRecord).refundAddress;

  if (!refundAddress) {
    ctx.session.step = "AWAITING_CLAIM_ADDRESS";
    ctx.session.claimOrderId = contract.data.id;
    return ctx.reply(dict.askRefundAddress, { parse_mode: "Markdown" });
  }

  return startClaimPasswordFlow(ctx, contract, refundAddress);
}
export async function startClaimPasswordFlow(
  ctx: BotContext,
  contract: UnifiedContract,
  receivingAddress: string,
) {
  const dict = ctx.dict;
  const userId = ctx.from?.id;

  const isFirstLiquidation = contract.isLoan && contract.data.status === LoanStatus.Liquidatable;
  const isSecondLiquidation = contract.isLoan && contract.data.status === LoanStatus.PartiallyLiquidated;
  const isRefund =
    contract.data.status === OrderStatus.Refundable ||
    contract.data.status === LoanStatus.Refundable;

  const baseSats = contract.isLoan
    ? (contract.data as LoanRecord).collateralSats!
    : (contract.data as OrderRecord).amountSats;

  const funding = await checkEscrowFunding(contract.data.escrowAddress!);
  const totalFundedSats = funding?.totalFundedSats ?? baseSats;

  let minerFeeSats = 0;
  let finalAmount = 0;
  let feeRate = 0;

  if (isFirstLiquidation) {
    const lenderBaseShare = Math.floor(baseSats * 0.90);
    const baseBotFee = Math.floor(baseSats * 0.05);
    const borrowerLeftover = totalFundedSats - lenderBaseShare - baseBotFee;

    let feeEstimation = await getLiveMinerFee({
      escrowAddress: contract.data.escrowAddress!,
      outputCount: 3,
      customFeeRate: ctx.user.customFee,
    });

    if (borrowerLeftover < DUST_LIMIT) {
      feeEstimation = await getLiveMinerFee({
        escrowAddress: contract.data.escrowAddress!,
        outputCount: 2,
        customFeeRate: ctx.user.customFee,
      });
    }

    minerFeeSats = feeEstimation.satsAmount;
    feeRate = feeEstimation.feeRate;

    const isLender = userId === contract.sellerOrLenderId;
    finalAmount = isLender 
      ? lenderBaseShare - minerFeeSats 
      : borrowerLeftover - minerFeeSats;

  } else if (isSecondLiquidation) {
    let feeEstimation = await getLiveMinerFee({
      escrowAddress: contract.data.escrowAddress!,
      outputCount: 1,
      customFeeRate: ctx.user.customFee,
    });

    minerFeeSats = feeEstimation.satsAmount;
    feeRate = feeEstimation.feeRate;
    
    finalAmount = totalFundedSats - minerFeeSats;

  } else {
    const botFeePercent = getBotFeePercent(baseSats);
    let outputCount = 1;

    if (!isRefund) {
      const buyerFee = Math.floor((baseSats * (botFeePercent / 100)) / 2);
      const botOutputEstimate = totalFundedSats - baseSats + buyerFee;
      outputCount = botOutputEstimate >= DUST_LIMIT ? 2 : 1;
    }

    const feeEstimation = await getLiveMinerFee({
      escrowAddress: contract.data.escrowAddress!,
      outputCount,
      customFeeRate: ctx.user.customFee,
    });

    minerFeeSats = feeEstimation.satsAmount;
    feeRate = feeEstimation.feeRate;

    if (isRefund) {
      finalAmount = totalFundedSats - minerFeeSats;
    } else {
      const totalBotFeeSats = Math.floor(baseSats * (botFeePercent / 100));
      const buyerFeeSats = Math.floor(totalBotFeeSats / 2);
      finalAmount = baseSats - buyerFeeSats - minerFeeSats;
    }
  }

  ctx.session.step = "CLAIM_PASSWORD";
  ctx.session.claimOrderId = contract.data.id;

  await ctx.reply(
    dict.askClaimPassword(minerFeeSats, finalAmount, receivingAddress, feeRate),
    { parse_mode: "Markdown" },
  );
}
