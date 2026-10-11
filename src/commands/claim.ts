import * as bitcoin from "bitcoinjs-lib";
import { getContract, tryTransitionContract } from "../db/contracts.js";
import type {
  BotContext,
  CallbackContext,
  CommandContext,
  OrderRecord,
  LoanRecord,
} from "../types.js";
import type { UnifiedContract } from "../db/contracts.js";
import {
  type PayoutAction,
  buildUnsignedPayoutPsbt,
  network,
  deriveOrderBotKeypair,
  checkIfExternallySpent,
} from "../core/bitcoin/index.js";
import { OrderStatus, LoanStatus } from "../shared/constants.js";
import { buildOrderSelectKeyboard } from "../shared/keyboards.js";
import { getUnifiedUserContractsForAction } from "../db/contracts.js";
import { Markup } from "telegraf";
import { safeDeleteMsg } from "../utils/telegram.js";

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
  if (ctx.callbackQuery) await safeDeleteMsg(ctx);
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
    contract.isLoan &&
    [LoanStatus.Liquidatable, LoanStatus.Expired].includes(
      contract.data.status! as any,
    );
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
  const isSpent = await checkIfExternallySpent(
    contract,
    contract.amountSatsOrCollateral,
  );
  
  if (isSpent) {
    const didTransition = await tryTransitionContract(
      contract,
      [contract.data.status as any],
      contract.isLoan
        ? LoanStatus.ExternallySigned
        : OrderStatus.ExternallySigned,
    );

    if (didTransition) {
      if (ctx.callbackQuery) {
        await ctx.editMessageText(ctx.dict.fundsAlreadyMoved, { parse_mode: "Markdown" });
      } else {
        await ctx.reply(ctx.dict.fundsAlreadyMoved, { parse_mode: "Markdown" });
      }
    }
    return;
  }

  let actionType: PayoutAction = "RELEASE";
  if (
    contract.data.status === OrderStatus.Refundable ||
    contract.data.status === LoanStatus.Refundable
  ) {
    actionType = "REFUND";
  } else if (
    contract.isLoan &&
    (contract.data.status === LoanStatus.Liquidatable ||
      contract.data.status === LoanStatus.PartiallyLiquidated)
  ) {
    actionType = "LIQUIDATION";
  }

  try {
    const { psbtHex, minerFee, finalAmount, feeRate } = await buildUnsignedPayoutPsbt(
      contract,
      actionType,
      ctx.user.customFee,
      ctx.from?.id,
      receivingAddress,
    );

    const psbt = bitcoin.Psbt.fromHex(psbtHex, { network });
    const escrowBotKeypair = deriveOrderBotKeypair(contract.data.id);
    psbt.signAllInputs(escrowBotKeypair);

    const partiallySignedHex = psbt.toHex();
    const networkStr = network.bech32 === "tb" ? "testnet" : "mainnet";
    const miniappUrl = `https://abitp2pbot.ilumivo.com/?network=${networkStr}&psbt=${partiallySignedHex}`;

    await ctx.reply(
      ctx.dict.showClaimPreview(minerFee, finalAmount, receivingAddress, feeRate!),
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback(
              ctx.dict.btnTypePassword,
              `claim_internal_${contract.data.id}`,
            ),
          ],
          [Markup.button.webApp(ctx.dict.btnSignMiniapp, miniappUrl)],
          [Markup.button.callback(ctx.dict.btnTxSubmitted, `verify_claim_${contract.data.id}`)],
        ]),
      },
    );
  } catch (error: any) {
    console.error(error);
    await ctx.reply(ctx.dict.errorGeneratingPsbt);
  }
}
