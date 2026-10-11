import { Markup, type Telegraf } from "telegraf";
import {
  resolveDispute,
  type SettleResolution,
} from "../handlers/disputeHandler.js";
import {
  handleMakerConfirm,
  handleOrderCancelledRepublish,
  handleTakeOrder,
  handleTakerConfirm,
} from "../handlers/orderHandler.js";
import type { LoanRecord, BotContext } from "../types.js";
import { getOrder, tryTransitionOrderStatus } from "../db/orders.js";
import { LoanStatus, OrderStatus } from "../shared/constants.js";
import { getUser } from "../db/users.js";
import { getUserDict } from "../locales/index.js";
import { safeDeleteMsg, safeRemoveMarkup } from "../utils/telegram.js";
import { routeCancel } from "../commands/cancel.js";
import { markAsFiatSent } from "../commands/fiatsent.js";
import { askReleaseConfirmation, doFundsRelease } from "../commands/release.js";
import { initiateClaim } from "../commands/claim.js";
import { handleSetLangAction } from "../commands/setlang.js";
import { handleLoanWizardAction } from "../wizards/loanWizard.js";
import { handleMarginAction } from "../wizards/orderWizard.js";
import { handleRating } from "../handlers/ratingHandler.js";
import { users } from "../db/schema.js";
import { db } from "../db/index.js";
import { eq } from "drizzle-orm";
import {
  handleConfirmReceipt,
  handleLoanCancelledRepublish,
  handleLoanMakerConfirm,
  handleLoanTakerConfirm,
  handleTakeLoan,
  proceedToLoanMakerConfirmation,
} from "../handlers/loanHandler.js";
import {
  getAccruedInterest,
  getContract,
  getUnifiedUserContractsForAction,
  tryTransitionContract,
} from "../db/contracts.js";
import {
  handleLoanFullRepay,
  handleRepaymentPreview,
  handleRepaymentRequest,
} from "../commands/repaid.js";
import { confirmLoanPayment, rejectLoanPayment } from "../db/loans.js";
import { fetchMempool } from "../core/bitcoin/network.js";
import { buildOrderSelectKeyboard } from "../shared/keyboards.js";
import { cleanMD } from "../utils/format.js";

export function setupActions(bot: Telegraf<BotContext>) {
  bot.action(/^take_loan_(.+)$/, (ctx) => handleTakeLoan(ctx, ctx.match[1]!));
  bot.action(/^taker_yes_loan_(.+)$/, (ctx) =>
    handleLoanTakerConfirm(ctx, ctx.match[1]!),
  );

  bot.action(/^taker_final_yes_loan_(.+)$/, (ctx) =>
    proceedToLoanMakerConfirmation(ctx, ctx.match[1]!),
  );

  bot.action(/^confirmReceipt_(.+)$/, (ctx) =>
    handleConfirmReceipt(ctx, ctx.match[1]!),
  );
  bot.action(/^fullyRepaid_(.+)$/, async (ctx) => {
    const contract = await getContract<LoanRecord>(ctx.match[1]!);
    if (!contract || !contract.isLoan)
      return ctx.answerCbQuery(ctx.dict.orderNotFound);

    const accruedInterest = getAccruedInterest(contract.data);
    const totalDebt =
      contract.data.fiatAmountLocked! +
      accruedInterest -
      contract.data.amountRepaid!;

    ctx.session.awaitingRepaidAmountForLoan = undefined;
    await safeDeleteMsg(ctx);
    await handleRepaymentRequest(
      ctx,
      contract,
      parseFloat(totalDebt.toFixed(2)),
    );
  });

  bot.action(/^confirmPay_(.+)$/, async (ctx) => {
    try {
      const paymentId = ctx.match[1]!;
      const result = await confirmLoanPayment(paymentId);
      const contract = await getContract<LoanRecord>(result.loanId);
      if (!contract) return;
      await safeRemoveMarkup(ctx);
      await ctx.reply(
        ctx.dict.paymentConfirmedAction(
          result.amountPaid,
          contract.data.fiatCode,
        ),
      );

      const borrower = await getUser(contract.buyerOrBorrowerId!);

      await ctx.telegram.sendMessage(
        borrower!.telegramId,
        ctx.dict.borrowerPaymentConfirmed(
          result.amountPaid,
          contract.data.fiatCode,
        ),
      );
      let interest = getAccruedInterest(contract.data);
      const targetRepayment = parseFloat(
        (contract.data.fiatAmountLocked! + interest).toFixed(2),
      );
      if (result.totalRepaidNow >= targetRepayment - 0.01) {
        await handleLoanFullRepay(ctx, contract);
      }
    } catch (e) {
      return ctx.answerCbQuery(ctx.dict.paymentError, { show_alert: true });
    }
  });

  bot.action(/^rejectPay_(.+)$/, async (ctx) => {
    try {
      const paymentId = ctx.match[1]!;
      const payment = await rejectLoanPayment(paymentId);

      const contract = await getContract<LoanRecord>(payment.loanId);
      if (!contract) return;

      await safeRemoveMarkup(ctx);
      await ctx.reply(ctx.dict.paymentRejectedAction);

      const borrower = await getUser(contract.buyerOrBorrowerId!);
      if (borrower) {
        const borrowerDict = getUserDict(borrower.language);

        await ctx.telegram.sendMessage(
          borrower.telegramId,
          borrowerDict.borrowerPaymentRejected(
            payment.amount,
            contract.data.fiatCode,
          ),
        );
      }
    } catch (e) {
      return ctx.answerCbQuery(ctx.dict.paymentError, { show_alert: true });
    }
  });

  bot.action(/^maker_yes_loan_(.+)$/, (ctx) =>
    handleLoanMakerConfirm(ctx, ctx.match[1]!),
  );
  bot.action(/^taker_cancel_order_loan_(.+)$/, (ctx) =>
    handleLoanCancelledRepublish(ctx, ctx.match[1]!),
  );
  bot.action(/^take_order_(.+)$/, (ctx) => handleTakeOrder(ctx, ctx.match[1]!));
  bot.action(/^taker_yes_(.+)$/, (ctx) =>
    handleTakerConfirm(ctx, ctx.match[1]!),
  );
  bot.action(/^maker_yes_(.+)$/, (ctx) =>
    handleMakerConfirm(ctx, ctx.match[1]!),
  );
  bot.action(/^taker_cancel_order_(.+)$/, (ctx) =>
    handleOrderCancelledRepublish(ctx, ctx.match[1]!),
  );

  bot.action(/^maker_deny_(.+)$/, async (ctx) => {
    const orderId = ctx.match[1]!;
    const order = await getOrder(orderId);
    if (!order) return;

    const didCancel = await tryTransitionOrderStatus(
      orderId,
      [OrderStatus.WaitingMakerConfirmation],
      OrderStatus.Cancelled,
    );
    if (!didCancel) {
      await safeRemoveMarkup(ctx);
      return ctx.answerCbQuery(ctx.dict.cancelNotAllowed, { show_alert: true });
    }

    await ctx.editMessageText(ctx.dict.orderCancelled);

    if (order.takerId) {
      const taker = await getUser(order.takerId);
      const takerDict = getUserDict(taker?.language);
      await ctx.telegram.sendMessage(
        order.takerId,
        takerDict.counterpartyCanceledDeleted(orderId),
        { parse_mode: "Markdown" },
      );
    }
  });

  bot.action(/^cancelCommand_(.+)$/, async (ctx) => {
    await safeRemoveMarkup(ctx);
    return routeCancel(ctx, ctx.match[1]!);
  });

  bot.action(/^fiatsentCommand_(.+)$/, (ctx) =>
    markAsFiatSent(ctx, ctx.match[1]!),
  );
  bot.action(/^releaseCommand_(.+)$/, (ctx) =>
    askReleaseConfirmation(ctx, ctx.match[1]!),
  );
  bot.action(/^confirmRelease_(.+)$/, async (ctx) => {
    const orderId = ctx.match[1]!;
    const order = await getOrder(orderId);
    if (!order)
      return ctx.answerCbQuery(ctx.dict.orderNotFound, { show_alert: true });
    return doFundsRelease(ctx, order);
  });
  bot.action(/^cancelRelease$/, (ctx) =>
    ctx.editMessageText(ctx.dict.cancelled),
  );
  bot.action(/^claimCommand_(.+)$/, (ctx) => initiateClaim(ctx, ctx.match[1]!));
  bot.action(/^repayCommand_(.+)$/, async (ctx) => {
    const contract = await getContract<LoanRecord>(ctx.match[1]!);
    if (!contract || !contract.isLoan)
      return await ctx.reply(ctx.dict.orderNotFound);
    let validContracts = await getUnifiedUserContractsForAction(
      ctx.user.telegramId,
      "REPAY",
    );
    if (!validContracts.some((x) => x.id === contract.data.id))
      return await ctx.reply(ctx.dict.orderNotFound);
    await safeDeleteMsg(ctx);
    await handleRepaymentPreview(ctx, contract);
  });
  bot.action(/^setlang_(.+)$/, (ctx) => handleSetLangAction(ctx));

  bot.action(/^setfee_default$/, async (ctx) => {
    await db
      .update(users)
      .set({ customFee: null })
      .where(eq(users.telegramId, ctx.from!.id));
    await ctx.answerCbQuery();
    await ctx.editMessageText(ctx.dict.feeResetSuccess, {
      parse_mode: "Markdown",
    });
  });

  bot.action(/^ltv_(.+)$/, (ctx) => handleLoanWizardAction(ctx));
  bot.action(/^margin_(.+)$/, (ctx) => handleMarginAction(ctx));

  bot.action(/^rate_(\d+)_(.+)$/, (ctx) => {
    const stars = parseInt(ctx.match[1]!);
    const orderId = ctx.match[2]!;
    return handleRating(ctx, { orderId, stars, raterId: ctx.from!.id });
  });

  bot.action(/^claim_internal_(.+)$/, async (ctx) => {
    const contractId = ctx.match[1]!;
    ctx.session.step = "CLAIM_PASSWORD";
    ctx.session.claimOrderId = contractId;

    await ctx.answerCbQuery();
    await ctx.reply(ctx.dict.promptPasswordShort, { parse_mode: "Markdown" });
  });

  bot.action(/^verify_claim_(.+)$/, async (ctx) => {
    const contractId = ctx.match[1]!;
    const contract = await getContract(contractId);

    if (!contract || !contract.data.escrowAddress) {
      return ctx.answerCbQuery(ctx.dict.orderNotFound, { show_alert: true });
    }

    try {
      const res = await fetchMempool(
        `address/${contract.data.escrowAddress}/txs`,
      );
      if (!res.ok) throw new Error("Error consultando la red");
      const txs = await res.json();

      const wasSpent = txs.some((tx: any) =>
        tx.vin.some(
          (vin: any) =>
            vin.prevout &&
            vin.prevout.scriptpubkey_address === contract.data.escrowAddress,
        ),
      );

      if (wasSpent) {
        await ctx.answerCbQuery(ctx.dict.transactionDetected, {
          show_alert: true,
        });

        const didTransition = await tryTransitionContract(
          contract,
          [contract.data.status as any],
          contract.isLoan
            ? LoanStatus.ExternallySigned
            : OrderStatus.ExternallySigned,
        );

        if (didTransition) {
          await ctx.editMessageText(
            `✅ *Transacción Externa Completada*\n\nLos fondos han sido movidos exitosamente desde la MiniApp o una billetera externa. El contrato ha sido cerrado.`,
            { parse_mode: "Markdown" },
          );
        }
      } else {
        await ctx.answerCbQuery(ctx.dict.noExternalTxDetected, {
          show_alert: true,
        });
      }
    } catch (error: any) {
      await ctx.answerCbQuery("Ocurrió un error al verificar con la red.", {
        show_alert: true,
      });
    }
  });
  bot.action(
    /^settle_(buyer|seller|refund|loan_refund|loan_release|loan_liquidate|loan_active)_(.+)$/,
    (ctx) => {
      const resolution = ctx.match[1]!.toUpperCase() as SettleResolution;
      const contractId = ctx.match[2]!;
      return resolveDispute(ctx, contractId, resolution);
    },
  );

  bot.action("backup_user", async (ctx) => {
    await ctx.editMessageText(ctx.dict.backupUserWarning, {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback(ctx.dict.btnRevealKeys, "reveal_user_keys")],
        [Markup.button.callback(ctx.dict.btnBack, "back_to_backup_menu")],
      ]),
    });
  });

  bot.action("reveal_user_keys", async (ctx) => {
    const pubkey = ctx.user.pubkey || "N/A";
    const encryptedWif = ctx.user.encryptedWif || "N/A";

    await ctx.editMessageText(cleanMD(ctx.dict.backupUserKeys(pubkey, encryptedWif)), {
      parse_mode: "MarkdownV2",
    });
  });

  bot.action("backup_orders_list", async (ctx) => {
    const activeContracts = await getUnifiedUserContractsForAction(
      ctx.from.id,
      "BACKUP",
    );

    if (!activeContracts || activeContracts.length === 0) {
      return ctx.answerCbQuery(ctx.dict.noActiveContractsBackup, {
        show_alert: true,
      });
    }
    const keyboard = buildOrderSelectKeyboard(
      activeContracts,
      "backup_contract",
    );
    keyboard.reply_markup.inline_keyboard.push([
      Markup.button.callback(ctx.dict.btnBack, "back_to_backup_menu"),
    ]);
    await ctx.editMessageText(ctx.dict.backupContractsListText, {
      parse_mode: "Markdown",
      ...keyboard,
    });
  });

  bot.action(/^backup_contract_(.+)$/, async (ctx) => {
    const contractId = ctx.match[1]!;
    const contract = await getContract(contractId);

    if (!contract) {
      return ctx.answerCbQuery(ctx.dict.orderNotFound, { show_alert: true });
    }

    const witnessScript = contract.data.witnessScript || "N/A";
    const escrowAddress = contract.data.escrowAddress || "N/A";

    await ctx.editMessageText(
      ctx.dict.backupContractDetails(contractId, escrowAddress, witnessScript),
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback(
              ctx.dict.btnBackToList,
              "backup_orders_list",
            ),
          ],
          [Markup.button.callback(ctx.dict.btnCancel, "cancel_action")],
        ]),
      },
    );
  });

  bot.action("back_to_backup_menu", async (ctx) => {
    await ctx.editMessageText(ctx.dict.backupMenuText, {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback(ctx.dict.btnBackupUser, "backup_user")],
        [
          Markup.button.callback(
            ctx.dict.btnBackupContract,
            "backup_orders_list",
          ),
        ],
        [Markup.button.callback(ctx.dict.btnCancel, "cancel_action")],
      ]),
    });
  });

  bot.action("cancel_action", async (ctx: BotContext) => {
    ctx.session = { step: "IDLE", draft: {} };
    await safeDeleteMsg(ctx);
    await ctx.reply(ctx.dict.cancelled);
  });

  bot.on("callback_query", (ctx) => ctx.answerCbQuery());
}
