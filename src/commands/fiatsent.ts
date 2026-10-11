import { getUser } from "../db/users.js";
import { getUserDict } from "../locales/index.js";
import type { CallbackContext, CommandContext } from "../types.js";
import { escapeMarkdown } from "../utils/format.js";
import { buildOrderSelectKeyboard } from "../shared/keyboards.js";
import { LoanStatus, OrderStatus } from "../shared/constants.js";
import {
  getContract,
  getFiatPaymentParties,
  getUnifiedUserContractsForAction,
  tryTransitionContract,
} from "../db/contracts.js";
import { Markup } from "telegraf";

export async function fiatsentCommand(ctx: CommandContext) {
  const userId = ctx.from.id;
  const dict = ctx.dict;

  const args = ctx.message.text.split(" ");
  if (args.length < 2) {
    const combinedContracts = await getUnifiedUserContractsForAction(
      userId,
      "FIATSENT",
    );

    if (combinedContracts.length === 0)
      return await ctx.reply(dict.noActiveOrdersFound, {
        parse_mode: "Markdown",
      });

    return await ctx.reply(dict.selectOrderToMarkAsPaid, {
      ...buildOrderSelectKeyboard(combinedContracts, "fiatsentCommand"),
    });
  }

  const orderId = args[1] as string;
  await markAsFiatSent(ctx, orderId);
}

export async function markAsFiatSent(
  ctx: CallbackContext | CommandContext,
  contractId: string,
) {
  const userId = ctx.from.id;
  const dict = ctx.dict;

  try {
    if (ctx.callbackQuery) await ctx.deleteMessage();
  } catch (e) {}

  const contract = await getContract(contractId);
  if (!contract) return ctx.reply(dict.orderNotFound);

  const isValidOrder =
    !contract.isLoan && contract.data.status === OrderStatus.Active;
  const isValidLoan =
    contract.isLoan && contract.data.status === LoanStatus.WaitingDisbursement;

  if (!isValidOrder && !isValidLoan) return ctx.reply(dict.invalidOrderStatus);

  const { senderId, receiverId } = getFiatPaymentParties(contract);

  if (userId !== senderId) return ctx.reply(dict.onlyBuyer);

  const fromStatuses = contract.isLoan
    ? [LoanStatus.WaitingDisbursement]
    : [OrderStatus.Active];
  const toStatus = contract.isLoan
    ? LoanStatus.DisbursementSent
    : OrderStatus.FiatSent;

  const didMark = await tryTransitionContract(contract, fromStatuses, toStatus);
  if (!didMark) return ctx.reply(dict.invalidOrderStatus);

  const receiver = await getUser(receiverId!);
  const dictReceiver = getUserDict(receiver?.language);
  const senderName = escapeMarkdown(ctx.from.username!);

  const msgSender = contract.isLoan
    ? dict.loanFiatSentToLender
    : dict.fiatSentToBuyer;
  const msgReceiver = contract.isLoan
    ? dictReceiver.loanFiatSentToBorrower
    : dictReceiver.fiatSentToSeller;

  await ctx.reply(msgSender(contract.data.id), { parse_mode: "Markdown" });
  let extra = { parse_mode: "Markdown" };
  if (contract.isLoan)
    extra = {
      ...extra,
      ...Markup.inlineKeyboard([
        Markup.button.callback(
          dictReceiver.btnConfirmReceipt,
          "confirmReceipt_" + contract.data.id,
        ),
      ]),
    };
  await ctx.telegram.sendMessage(
    receiverId!,
    msgReceiver(contract.data.id, senderName),
    extra as any,
  );
}
