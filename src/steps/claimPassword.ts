import { getContract, tryTransitionContract } from "../db/contracts.js";
import { OrderStatus, LoanStatus } from "../shared/constants.js";
import { safeDeleteMsg } from "../utils/telegram.js";
import type { CommandContext, LoanRecord, OrderRecord } from "../types.js";
import { decryptData } from "../utils/crypto.js";
import {
  processContractPayout,
  type PayoutAction,
} from "../core/bitcoin/transactions.js";

export async function claimPasswordStep(ctx: CommandContext) {
  const text = ctx.message.text;
  const password = text;
  const contractId = ctx.session.claimOrderId;
  const userId = ctx.from.id;

  ctx.session.step = "IDLE";
  ctx.session.claimOrderId = undefined;
  await safeDeleteMsg(ctx);

  const contract = await getContract(contractId!);
  if (!contract) return ctx.reply(ctx.dict.orderNotFound);

  const isReleasable =
    contract.data.status === OrderStatus.Releasable ||
    contract.data.status === LoanStatus.Releasable;
  const isRefundable =
    contract.data.status === OrderStatus.Refundable ||
    contract.data.status === LoanStatus.Refundable;

  const isFirstLiquidation =
    contract.isLoan && contract.data.status === LoanStatus.Liquidatable;
  const isSecondLiquidation =
    contract.isLoan && contract.data.status === LoanStatus.PartiallyLiquidated;
  const isLiquidation = isFirstLiquidation || isSecondLiquidation;

  if (!isReleasable && !isRefundable && !isLiquidation) {
    return ctx.reply(ctx.dict.invalidOrderStatus);
  }

  const allowedUserForRefund = contract.isLoan
    ? contract.buyerOrBorrowerId
    : contract.sellerOrLenderId;
  const allowedUserForRelease = contract.buyerOrBorrowerId;

  if (isRefundable && userId !== allowedUserForRefund)
    return ctx.reply(ctx.dict.onlySeller); // TODO: cambiar a onlyBorrower
  if (isReleasable && userId !== allowedUserForRelease)
    return ctx.reply(ctx.dict.onlyBuyer);

  if (
    isLiquidation &&
    userId !== contract.sellerOrLenderId &&
    userId !== contract.buyerOrBorrowerId
  )
    return ctx.reply(ctx.dict.unauthorizedAccess);

  let signerWif: string;
  try {
    signerWif = decryptData(ctx.user.encryptedWif!, password);
  } catch (error) {
    return ctx.reply(ctx.dict.invalidPassword(`/claim ${contractId}`), {
      parse_mode: "Markdown",
    });
  }

  const loadingMsg = await ctx.reply(ctx.dict.psbtSigningLoading, {
    parse_mode: "Markdown",
  });

  try {
    let targetStatus: any;
    if (isRefundable) {
      targetStatus = contract.isLoan
        ? LoanStatus.Refunded
        : OrderStatus.Refunded;
    } else if (isFirstLiquidation) {
      targetStatus = LoanStatus.PartiallyLiquidated; 
    } else if (isSecondLiquidation) {
      targetStatus = LoanStatus.Liquidated; 
    } else {
      targetStatus = contract.isLoan
        ? LoanStatus.Completed
        : OrderStatus.Completed;
    }

    const currentValidStatus = contract.data.status;

    let actionType: PayoutAction;
    if (isRefundable) actionType = "REFUND";
    else if (isLiquidation) actionType = "LIQUIDATION";
    else actionType = "RELEASE";

    let claimAddress: string | null = null;
    if (contract.isLoan) {
      claimAddress =
        userId === contract.buyerOrBorrowerId
          ? (contract.data as LoanRecord).borrowerAddress!
          : (contract.data as LoanRecord).lenderAddress!;
    } else {
      claimAddress =
        userId === contract.buyerOrBorrowerId
          ? (contract.data as OrderRecord).buyerAddress
          : (contract.data as OrderRecord).refundAddress;
    }

    let txid = await processContractPayout(
      contract,
      signerWif,
      actionType,
      ctx.user.customFee,
      userId,
      claimAddress ?? undefined,
    );

    // Si es liquidación, el estado previo podría ser Liquidatable (1er reclamo) o PartiallyLiquidated (2do reclamo)
    const validFromStatuses = isFirstLiquidation
      ? [LoanStatus.Liquidatable]
      : isSecondLiquidation
        ? [LoanStatus.PartiallyLiquidated]
        : [currentValidStatus];

    const didTransition = await tryTransitionContract(
      contract,
      validFromStatuses as any,
      targetStatus,
      { payoutTxid: txid },
    );

    if (!didTransition) {
      console.error(
        `Inconsistencia: TX ${txid} transmitida pero estado en BD no actualizado para contrato ${contract.data.id}`,
      );
    }

    await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);

    if (isLiquidation) {
      await ctx.reply(ctx.dict.liquidationSuccess(txid), {
        parse_mode: "Markdown",
      });
    } else if (isRefundable) {
      await ctx.reply(ctx.dict.refundSuccess(txid), { parse_mode: "Markdown" });
    } else {
      await ctx.reply(ctx.dict.claimSuccess(txid), { parse_mode: "Markdown" });
    }
  } catch (error: any) {
    await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);
    console.error(error);
    return ctx.reply(ctx.dict.errorProcessingTx(error.message), {
      parse_mode: "Markdown",
    });
  }
}
