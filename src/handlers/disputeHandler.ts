import { and, eq, isNull } from "drizzle-orm";
import { loans, orders } from "../db/schema.js";
import {
  tryConditionalLoanUpdate,
  tryConditionalOrderUpdate,
} from "../db/orders.js";
import { getUser } from "../db/users.js";
import { dictionaries, getUserDict } from "../locales/index.js";
import type { CommandContext, CallbackContext } from "../types.js";
import { generateVerificationCode } from "../utils/crypto.js";
import { isAdmin } from "../utils/admin.js";
import { buildSettleDisputeKeyboard } from "../shared/keyboards.js";
import { escapeMarkdown } from "../utils/format.js";
import { safeRemoveMarkup } from "../utils/telegram.js";
import { LoanStatus, OrderStatus } from "../shared/constants.js";
import { getContract, tryTransitionContract } from "../db/contracts.js";

const ADMIN_GROUP_ID = process.env.ADMIN_GROUP_ID;

// Códigos de verificación: SOLO viven en memoria del proceso.
// Se generan una única vez al abrir la disputa
// y se reutilizan tal cual (sin regenerar) al anunciar el admin asignado
// Si el proceso se reinicia entre /dispute y
// /takedispute, el aviso de asignación simplemente indica que el código no está
// disponible (ver takeDispute) en vez de inventar uno nuevo.
const disputeCodesCache = new Map<
  string,
  { buyerCode: string; sellerCode: string }
>();

const DISPUTE_ELIGIBLE_STATUSES = [
  OrderStatus.Active,
  OrderStatus.FiatSent,
  OrderStatus.CancelRequested,
  LoanStatus.WaitingDisbursement,
  LoanStatus.DisbursementSent,
  LoanStatus.Active,
  LoanStatus.CancelRequested,
];

async function getDisplayHandle(telegramId: number): Promise<string> {
  const user = await getUser(telegramId);
  if (user) return `@${escapeMarkdown(user.username)}`;
  return `ID: ${telegramId}`;
}

export async function openDispute(ctx: CommandContext, id: string) {
  const userId = ctx.from.id;
  const dict = ctx.dict;

  const contract = await getContract(id);
  if (!contract) return ctx.reply(dict.orderNotFound);

  const sellerId = contract.sellerOrLenderId;
  const buyerId = contract.buyerOrBorrowerId;

  if (userId !== sellerId && userId !== buyerId)
    return ctx.reply(dict.unauthorizedAccess);
  if (!sellerId || !buyerId) return ctx.reply(dict.disputeNotAllowed);

  const previousStatus = contract.data.status!;

  const didTransition = await tryTransitionContract(
    contract,
    DISPUTE_ELIGIBLE_STATUSES,
    "DISPUTE",
    { cancelRequestedBy: null },
  );

  if (!didTransition) {
    const fresh = await getContract(id);
    if (fresh!.data.status === "DISPUTE")
      return ctx.reply(dict.disputeAlreadyOpen);
    return ctx.reply(dict.disputeNotAllowed);
  }

  const buyerCode = generateVerificationCode();
  const sellerCode = generateVerificationCode();
  disputeCodesCache.set(id, { buyerCode, sellerCode });

  const buyer = await getUser(buyerId);
  const seller = await getUser(sellerId);
  const buyerDict = getUserDict(buyer?.language);
  const sellerDict = getUserDict(seller?.language);

  await ctx.telegram.sendMessage(
    buyerId,
    buyerDict.disputeOpened(buyerCode, id),
    { parse_mode: "Markdown" },
  );
  await ctx.telegram.sendMessage(
    sellerId,
    sellerDict.disputeOpened(sellerCode, id),
    { parse_mode: "Markdown" },
  );

  if (!ADMIN_GROUP_ID) {
    console.error(
      `ADMIN_GROUP_ID no está configurado: no se pudo notificar la disputa de la orden ${id}`,
    );
    return;
  }

  await ctx.telegram.sendMessage(
    ADMIN_GROUP_ID,
    dictionaries.es.disputeAdminGroupMessage({
      orderId: contract.data.id,
      type: contract.data.type,
      fiatCode: contract.data.fiatCode,
      amountFiat: `${contract.data.fiatAmountLocked}`,
      status: previousStatus,
      escrowAddress: contract.data.escrowAddress || "N/A",
      buyerUsername: escapeMarkdown(buyer!.username),
      sellerUsername: escapeMarkdown(seller!.username),
      buyerCode,
      sellerCode,
    }),
    { parse_mode: "Markdown" },
  );
}

export async function takeDispute(ctx: CommandContext, contractId: string) {
  const adminId = ctx.from.id;
  const dict = ctx.dict;

  if (!isAdmin(adminId)) return ctx.reply(dict.adminOnlyAction);

  const contract = await getContract(contractId);
  const disputeStatus = contract!.isLoan
    ? LoanStatus.Dispute
    : OrderStatus.Dispute;

  if (!contract || contract.data.status !== disputeStatus)
    return ctx.reply(dict.disputeNotFoundOrNotOpen);

  let assigned = false;
  if (contract.isLoan) {
    assigned = await tryConditionalLoanUpdate(
      contractId,
      and(eq(loans.status, disputeStatus), isNull(loans.disputeAdminId)),
      { disputeAdminId: adminId },
    );
  } else {
    assigned = await tryConditionalOrderUpdate(
      contractId,
      and(
        eq(orders.status, OrderStatus.Dispute),
        isNull(orders.disputeAdminId),
      ),
      { disputeAdminId: adminId },
    );
  }

  if (!assigned) return ctx.reply(dict.disputeAlreadyTaken);

  await ctx.reply(dict.disputeTakenSuccessAdmin(contractId), {
    parse_mode: "Markdown",
  });

  const adminUsername = ctx.from.username
    ? `@${escapeMarkdown(ctx.from.username)}`
    : `Admin (ID: ${adminId})`;

  const sellerId = contract.sellerOrLenderId;
  const buyerId = contract.buyerOrBorrowerId;
  if (!sellerId || !buyerId) return;

  const buyer = await getUser(buyerId);
  const seller = await getUser(sellerId);
  const buyerDict = getUserDict(buyer?.language);
  const sellerDict = getUserDict(seller?.language);

  const codes = disputeCodesCache.get(contractId);

  if (codes) {
    await ctx.telegram.sendMessage(
      buyerId,
      buyerDict.disputeTakenNotification(
        adminUsername,
        codes.buyerCode,
        contractId,
      ),
      { parse_mode: "Markdown" },
    );
    await ctx.telegram.sendMessage(
      sellerId,
      sellerDict.disputeTakenNotification(
        adminUsername,
        codes.sellerCode,
        contractId,
      ),
      { parse_mode: "Markdown" },
    );
    disputeCodesCache.delete(contractId);
  } else {
    console.warn(
      `Códigos de disputa no disponibles en memoria para la orden ${contractId} (¿reinicio del bot?)`,
    );
    await ctx.telegram.sendMessage(
      buyerId,
      buyerDict.disputeTakenNotificationNoCode(adminUsername, contractId),
      { parse_mode: "Markdown" },
    );
    await ctx.telegram.sendMessage(
      sellerId,
      sellerDict.disputeTakenNotificationNoCode(adminUsername, contractId),
      { parse_mode: "Markdown" },
    );
  }
}

export async function settleCommand(ctx: CommandContext, orderId: string) {
  const adminId = ctx.from.id;
  const dict = ctx.dict;

  if (!isAdmin(adminId)) return ctx.reply(dict.adminOnlyAction);

  const contract = await getContract(orderId);
  const disputeStatus = contract?.isLoan ? "DISPUTE" : OrderStatus.Dispute;

  if (!contract || contract.data.status !== disputeStatus)
    return ctx.reply(dict.settleNotFoundOrNotInDispute);
  if (contract.data.disputeAdminId !== adminId)
    return ctx.reply(dict.settleNotAssignedAdmin);

  const sellerId = contract.sellerOrLenderId;
  const buyerId = contract.buyerOrBorrowerId;

  if (!sellerId || !buyerId)
    return ctx.reply(dict.settleNotFoundOrNotInDispute);

  const buyerHandle = await getDisplayHandle(buyerId);
  const sellerHandle = await getDisplayHandle(sellerId);

  if (contract.isLoan) {
    await ctx.reply(dict.settlePromptLoan(orderId, buyerHandle, sellerHandle), {
      parse_mode: "Markdown",
      ...buildSettleDisputeKeyboard(contract.data.id, [
        {
          text: dict.settleBtnLoanRefund,
          prefix: "settle_loan_refund",
        },
        {
          text: dict.settleBtnLoanRelease,
          prefix: "settle_loan_release",
        },
        {
          text: dict.settleBtnLoanLiquidation,
          prefix: "settle_loan_liquidate",
        },
        {
          text: dict.settleBtnLoanActive,
          prefix: "settle_loan_active",
        },
      ]),
    });
  } else {
    await ctx.reply(dict.settlePrompt(orderId, buyerHandle, sellerHandle), {
      parse_mode: "Markdown",
      ...buildSettleDisputeKeyboard(contract.data.id, [
        {
          text: dict.settleBtnBuyer(buyerHandle),
          prefix: "settle_buyer",
        },
        {
          text: dict.settleBtnSeller(buyerHandle),
          prefix: "settle_seller",
        },
        {
          text: dict.settleBtnRefund,
          prefix: "settle_refund",
        },
      ]),
    });
  }
}

export type SettleResolution =
  | "BUYER"
  | "SELLER"
  | "REFUND"
  | "LOAN_REFUND"
  | "LOAN_RELEASE"
  | "LOAN_LIQUIDATE"
  | "LOAN_ACTIVE";

export async function resolveDispute(
  ctx: CallbackContext,
  contractId: string,
  resolution: SettleResolution,
) {
  const adminId = ctx.from.id;
  const dict = ctx.dict;

  if (!isAdmin(adminId)) {
    return ctx.answerCbQuery(dict.adminOnlyAction, { show_alert: true });
  }

  const contract = await getContract(contractId);
  if (!contract)
    return ctx.answerCbQuery(dict.orderNotFound, { show_alert: true });

  const disputeStatus = contract.isLoan ? "DISPUTE" : OrderStatus.Dispute;

  if (
    contract.data.status !== disputeStatus ||
    contract.data.disputeAdminId !== adminId
  ) {
    await safeRemoveMarkup(ctx);
    return ctx.answerCbQuery(
      contract.data.disputeAdminId !== adminId
        ? dict.settleNotAssignedAdmin
        : dict.settleStaleAction,
      { show_alert: true },
    );
  }

  let toStatus: any;
  if (contract.isLoan) {
    if (resolution === "LOAN_REFUND") toStatus = LoanStatus.Refundable;
    else if (resolution === "LOAN_RELEASE") toStatus = LoanStatus.Releasable;
    else if (resolution === "LOAN_ACTIVE") toStatus = LoanStatus.Active;
    else if (resolution === "LOAN_LIQUIDATE") toStatus = LoanStatus.Liquidatable;
    else
      return ctx.answerCbQuery("Resolución no válida para préstamos", {
        show_alert: true,
      });
  } else {
    if (resolution === "BUYER") toStatus = OrderStatus.Releasable;
    else if (resolution === "SELLER") toStatus = OrderStatus.Refundable;
    else if (resolution === "REFUND") toStatus = OrderStatus.Refundable;
    else
      return ctx.answerCbQuery("Resolución no válida para órdenes", {
        show_alert: true,
      });
  }

  const updateData =
    resolution === "LOAN_ACTIVE"
      ? { status: toStatus, disputeResolution: null, disputeAdminId: null }
      : { status: toStatus, disputeResolution: resolution };

  let resolved = false;
  if (contract.isLoan) {
    resolved = await tryConditionalLoanUpdate(
      contractId,
      and(eq(loans.status, disputeStatus), eq(loans.disputeAdminId, adminId)),
      updateData,
    );
  } else {
    resolved = await tryConditionalOrderUpdate(
      contractId,
      and(
        eq(orders.status, OrderStatus.Dispute),
        eq(orders.disputeAdminId, adminId),
      ),
      updateData,
    );
  }

  if (!resolved) {
    await safeRemoveMarkup(ctx);
    return ctx.answerCbQuery(dict.settleStaleAction, { show_alert: true });
  }

  await safeRemoveMarkup(ctx);
  await ctx.answerCbQuery();

  await ctx.reply(dict.settleResolvedAdmin(contractId, resolution), {
    parse_mode: "Markdown",
  });

  const sellerId = contract.sellerOrLenderId;
  const buyerId = contract.buyerOrBorrowerId;
  if (!sellerId || !buyerId) return;

  const buyer = await getUser(buyerId);
  const seller = await getUser(sellerId);
  const buyerDict = getUserDict(buyer?.language);
  const sellerDict = getUserDict(seller?.language);

  if (contract.isLoan) {
    if (resolution === "LOAN_REFUND") {
      await ctx.telegram.sendMessage(
        buyerId,
        buyerDict.loanDisputeRefunded(contractId),
        { parse_mode: "Markdown" },
      );
      await ctx.telegram.sendMessage(
        sellerId,
        sellerDict.loanDisputeRefunded(contractId),
        { parse_mode: "Markdown" },
      );
    } else if (resolution === "LOAN_RELEASE") {
      await ctx.telegram.sendMessage(
        buyerId,
        buyerDict.loanDisputeReleased(contractId),
        { parse_mode: "Markdown" },
      );
      await ctx.telegram.sendMessage(
        sellerId,
        sellerDict.loanDisputeReleased(contractId),
        { parse_mode: "Markdown" },
      );
    } else if (resolution === "LOAN_ACTIVE") {
      await ctx.telegram.sendMessage(
        buyerId,
        buyerDict.loanDisputeRestoredToActive(contractId),
        { parse_mode: "Markdown" },
      );
      await ctx.telegram.sendMessage(
        sellerId,
        sellerDict.loanDisputeRestoredToActive(contractId),
        { parse_mode: "Markdown" },
      );
    }
  } else {
    if (resolution === "BUYER") {
      await ctx.telegram.sendMessage(
        buyerId,
        buyerDict.settleBuyerWinsNotifyBuyer(contractId),
        { parse_mode: "Markdown" },
      );
      await ctx.telegram.sendMessage(
        sellerId,
        sellerDict.settleBuyerWinsNotifySeller(contractId),
        { parse_mode: "Markdown" },
      );
    } else if (resolution === "SELLER") {
      await ctx.telegram.sendMessage(
        sellerId,
        sellerDict.settleSellerWinsNotifySeller(contractId),
        { parse_mode: "Markdown" },
      );
      await ctx.telegram.sendMessage(
        buyerId,
        buyerDict.settleSellerWinsNotifyBuyer(contractId),
        { parse_mode: "Markdown" },
      );
    } else {
      await ctx.telegram.sendMessage(
        buyerId,
        buyerDict.settleCancelledNotifyBuyer(contractId),
        { parse_mode: "Markdown" },
      );
      await ctx.telegram.sendMessage(
        sellerId,
        sellerDict.settleCancelledNotifySeller(contractId),
        { parse_mode: "Markdown" },
      );
    }
  }
}
