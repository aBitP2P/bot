import { and, eq, isNull } from "drizzle-orm";
import { orders } from "../db/schema.js";
import {
  getOrder,
  tryTransitionOrderStatus,
  tryConditionalUpdate,
} from "../db/orders.js";
import { getUser } from "../db/users.js";
import { dictionaries, type Language } from "../locales/index.js";
import type { BotContext, CommandContext, CallbackContext } from "../types.js";
import { generateVerificationCode } from "../utils/crypto.js";
import { isAdmin } from "../utils/admin.js";
import { Markup } from "telegraf";
import { buildSettleDisputeKeyboard } from "../shared/keyboards.js";

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

const DISPUTE_ELIGIBLE_STATUSES = ["ACTIVE", "FIAT_SENT", "CANCEL_REQUESTED"];

function getPartyIds(order: typeof orders.$inferSelect): {
  sellerId: number | null;
  buyerId: number | null;
} {
  const isCreatorSelling = order.type === "SELL";
  return {
    sellerId: isCreatorSelling ? order.creatorId : order.takerId,
    buyerId: isCreatorSelling ? order.takerId : order.creatorId,
  };
}

async function getDisplayHandle(
  ctx: BotContext,
  telegramId: number,
): Promise<string> {
  const chat = (await ctx.telegram.getChat(telegramId).catch(() => null)) as {
    username?: string;
  } | null;
  if (chat?.username) return `@${chat.username}`;
  return `ID: ${telegramId}`;
}

export async function openDispute(ctx: CommandContext, orderId: string) {
  const userId = ctx.from.id;
  const dict = ctx.dict;

  const order = await getOrder(orderId);
  if (!order) return ctx.reply(dict.orderNotFound);

  const { sellerId, buyerId } = getPartyIds(order);
  if (userId !== sellerId && userId !== buyerId)
    return ctx.reply(dict.unauthorizedAccess);
  if (!sellerId || !buyerId) return ctx.reply(dict.disputeNotAllowed);

  const previousStatus = order.status;

  const didTransition = await tryTransitionOrderStatus(
    orderId,
    DISPUTE_ELIGIBLE_STATUSES,
    "DISPUTE",
    { cancelRequestedBy: null },
  );

  if (!didTransition) {
    const fresh = await getOrder(orderId);
    if (fresh?.status === "DISPUTE") return ctx.reply(dict.disputeAlreadyOpen);
    return ctx.reply(dict.disputeNotAllowed);
  }

  const buyerCode = generateVerificationCode();
  const sellerCode = generateVerificationCode();
  disputeCodesCache.set(orderId, { buyerCode, sellerCode });

  const buyer = await getUser(buyerId);
  const seller = await getUser(sellerId);
  const buyerDict = dictionaries[(buyer?.language as Language) || "es"];
  const sellerDict = dictionaries[(seller?.language as Language) || "es"];

  await ctx.telegram.sendMessage(
    buyerId,
    buyerDict.disputeOpened(buyerCode, orderId),
    { parse_mode: "Markdown" },
  );
  await ctx.telegram.sendMessage(
    sellerId,
    sellerDict.disputeOpened(sellerCode, orderId),
    { parse_mode: "Markdown" },
  );

  if (!ADMIN_GROUP_ID) {
    console.error(
      `ADMIN_GROUP_ID no está configurado: no se pudo notificar la disputa de la orden ${orderId}`,
    );
    return;
  }

  await ctx.telegram.sendMessage(
    ADMIN_GROUP_ID,
    dictionaries.es.disputeAdminGroupMessage({
      orderId: order.id,
      type: order.type,
      fiatCode: order.fiatCode,
      amountFiat: `${order.fiatAmountLocked}`,
      status: previousStatus,
      escrowAddress: order.escrowAddress || "N/A",
      buyerUsername: buyer!.username,
      sellerUsername: seller!.username,
      buyerCode,
      sellerCode,
    }),
    { parse_mode: "Markdown" },
  );
}

export async function takeDispute(ctx: CommandContext, orderId: string) {
  const adminId = ctx.from.id;
  const dict = ctx.dict;

  if (!isAdmin(adminId)) return ctx.reply(dict.adminOnlyAction);

  const order = await getOrder(orderId);
  if (!order || order.status !== "DISPUTE")
    return ctx.reply(dict.disputeNotFoundOrNotOpen);

  // Asignación atómica: solo si nadie más la tomó ya (evita doble-asignación
  // si dos admins ejecutan /takedispute casi simultáneamente).
  const assigned = await tryConditionalUpdate(
    orderId,
    and(eq(orders.status, "DISPUTE"), isNull(orders.disputeAdminId)),
    { disputeAdminId: adminId },
  );

  if (!assigned) return ctx.reply(dict.disputeAlreadyTaken);

  await ctx.reply(dict.disputeTakenSuccessAdmin(orderId), {
    parse_mode: "Markdown",
  });

  const adminUsername = ctx.from.username
    ? `@${ctx.from.username}`
    : `Admin (ID: ${adminId})`;
  const { sellerId, buyerId } = getPartyIds(order);
  if (!sellerId || !buyerId) return;

  const buyer = await getUser(buyerId);
  const seller = await getUser(sellerId);
  const buyerDict = dictionaries[(buyer?.language as Language) || "es"];
  const sellerDict = dictionaries[(seller?.language as Language) || "es"];

  const codes = disputeCodesCache.get(orderId);

  if (codes) {
    await ctx.telegram.sendMessage(
      buyerId,
      buyerDict.disputeTakenNotification(
        adminUsername,
        codes.buyerCode,
        orderId,
      ),
      { parse_mode: "Markdown" },
    );
    await ctx.telegram.sendMessage(
      sellerId,
      sellerDict.disputeTakenNotification(
        adminUsername,
        codes.sellerCode,
        orderId,
      ),
      { parse_mode: "Markdown" },
    );
    disputeCodesCache.delete(orderId);
  } else {
    console.warn(
      `Códigos de disputa no disponibles en memoria para la orden ${orderId} (¿reinicio del bot?)`,
    );
    await ctx.telegram.sendMessage(
      buyerId,
      buyerDict.disputeTakenNotificationNoCode(adminUsername, orderId),
      { parse_mode: "Markdown" },
    );
    await ctx.telegram.sendMessage(
      sellerId,
      sellerDict.disputeTakenNotificationNoCode(adminUsername, orderId),
      { parse_mode: "Markdown" },
    );
  }
}

export async function settleCommand(ctx: CommandContext, orderId: string) {
  const adminId = ctx.from.id;
  const dict = ctx.dict;

  if (!isAdmin(adminId)) return ctx.reply(dict.adminOnlyAction);

  const order = await getOrder(orderId);
  if (!order || order.status !== "DISPUTE")
    return ctx.reply(dict.settleNotFoundOrNotInDispute);
  if (order.disputeAdminId !== adminId)
    return ctx.reply(dict.settleNotAssignedAdmin);

  const { sellerId, buyerId } = getPartyIds(order);
  if (!sellerId || !buyerId)
    return ctx.reply(dict.settleNotFoundOrNotInDispute);

  const buyerHandle = await getDisplayHandle(ctx, buyerId);
  const sellerHandle = await getDisplayHandle(ctx, sellerId);

  await ctx.reply(dict.settlePrompt(orderId, buyerHandle, sellerHandle), {
    parse_mode: "Markdown",
    ...buildSettleDisputeKeyboard(
      dict.settleBtnBuyer(buyerHandle),
      dict.settleBtnSeller(sellerHandle),
      dict.settleBtnRefund,
      order.id,
    ),
  });
}

export type SettleResolution = "BUYER" | "SELLER" | "REFUND";

// Invocado desde los 3 botones de /settle (ver index.ts).
export async function resolveDispute(
  ctx: CallbackContext,
  orderId: string,
  resolution: SettleResolution,
) {
  const adminId = ctx.from.id;
  const dict = ctx.dict;

  // el admin pudo haber sido removido de ADMIN_IDS
  // después de que se le asignó la disputa.
  if (!isAdmin(adminId)) {
    return ctx.answerCbQuery(dict.adminOnlyAction, { show_alert: true });
  }

  const order = await getOrder(orderId);
  if (!order)
    return ctx.answerCbQuery(dict.orderNotFound, { show_alert: true });

  if (order.status !== "DISPUTE" || order.disputeAdminId !== adminId) {
    try {
      await ctx.editMessageReplyMarkup(undefined);
    } catch (e) {}
    return ctx.answerCbQuery(
      order.disputeAdminId !== adminId
        ? dict.settleNotAssignedAdmin
        : dict.settleStaleAction,
      { show_alert: true },
    );
  }

  const toStatus = resolution === "BUYER" ? "RELEASABLE" : "REFUNDABLE";

  const resolved = await tryConditionalUpdate(
    orderId,
    and(eq(orders.status, "DISPUTE"), eq(orders.disputeAdminId, adminId)),
    { status: toStatus, disputeResolution: resolution },
  );

  if (!resolved) {
    try {
      await ctx.editMessageReplyMarkup(undefined);
    } catch (e) {}
    return ctx.answerCbQuery(dict.settleStaleAction, { show_alert: true });
  }

  try {
    await ctx.editMessageReplyMarkup(undefined);
  } catch (e) {}
  await ctx.answerCbQuery();

  const resolutionLabel =
    resolution === "BUYER"
      ? dict.settleResolutionBuyerLabel
      : resolution === "SELLER"
        ? dict.settleResolutionSellerLabel
        : dict.settleResolutionRefundLabel;

  await ctx.reply(dict.settleResolvedAdmin(orderId, resolutionLabel), {
    parse_mode: "Markdown",
  });

  const { sellerId, buyerId } = getPartyIds(order);
  if (!sellerId || !buyerId) return;

  const buyer = await getUser(buyerId);
  const seller = await getUser(sellerId);
  const buyerDict = dictionaries[(buyer?.language as Language) || "es"];
  const sellerDict = dictionaries[(seller?.language as Language) || "es"];

  if (resolution === "BUYER") {
    await ctx.telegram.sendMessage(
      buyerId,
      buyerDict.settleBuyerWinsNotifyBuyer(orderId),
      { parse_mode: "Markdown" },
    );
    await ctx.telegram.sendMessage(
      sellerId,
      sellerDict.settleBuyerWinsNotifySeller(orderId),
      { parse_mode: "Markdown" },
    );
  } else if (resolution === "SELLER") {
    await ctx.telegram.sendMessage(
      sellerId,
      sellerDict.settleSellerWinsNotifySeller(orderId),
      { parse_mode: "Markdown" },
    );
    await ctx.telegram.sendMessage(
      buyerId,
      buyerDict.settleSellerWinsNotifyBuyer(orderId),
      { parse_mode: "Markdown" },
    );
  } else {
    await ctx.telegram.sendMessage(
      buyerId,
      buyerDict.settleCancelledNotifyBuyer(orderId),
      { parse_mode: "Markdown" },
    );
    await ctx.telegram.sendMessage(
      sellerId,
      sellerDict.settleCancelledNotifySeller(orderId),
      { parse_mode: "Markdown" },
    );
  }
}
