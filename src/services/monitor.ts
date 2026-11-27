import { and, eq, inArray, lte, or } from "drizzle-orm";
import { db } from "../db/index.js";
import { orders } from "../db/schema.js";
import { checkEscrowFunding, fetchMempool } from "../core/bitcoin/index.js";
import { Telegraf } from "telegraf";
import {
  type BotContext,
  type OrderRecord,
  type UserRecord,
} from "../types.js";
import { getUser } from "../db/users.js";
import { tryTransitionOrderStatus } from "../db/orders.js";
import { escapeMarkdown } from "../utils/format.js";
import { republishOrderSilently } from "../handlers/orderHandler.js";
import { getParties } from "../utils/order.js";
import { notifyUser } from "../utils/telegram.js";
import { OrderStatus } from "../shared/constants.js";
import { getSellerDepositSats } from "../config/fees.js";
import { removeOrderFromChannel } from "../services/orderPublisher.js";
import { watchHoldInvoice } from "../core/lightning/listeners.js";
import { SettlementMethodType, TERMINAL_STATUSES } from "../shared/constants.js";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;
const POLL_INTERVAL_MS = 60_000;
const notifiedPartial = new Set<string>();

type Bot = Telegraf<BotContext>;

/** Ejecuta `task` cada `ms`, sin solaparse con la ejecución anterior. */
function runEvery(ms: number, task: () => Promise<void>) {
  let running = false;
  setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await task();
    } finally {
      running = false;
    }
  }, ms);
}

function selectOrdersWithStatus(...statuses: string[]) {
  return db
    .select()
    .from(orders)
    .where(or(...statuses.map((s) => eq(orders.status, s))));
}

function selectOrdersWhere(status: string, updatedBefore: number) {
  return db
    .select()
    .from(orders)
    .where(
      and(eq(orders.status, status), lte(orders.updatedAt, updatedBefore)),
    );
}

export async function resumeHoldInvoiceWatches(bot: Bot) {
  const pending = await db
    .select()
    .from(orders)
    .where(
      and(
        inArray(orders.status, [OrderStatus.WaitingEscrow, OrderStatus.Active]),
        eq(orders.settlementMethod, SettlementMethodType.Lightning),
      ),
    );

  for (const order of pending) {
    if (!order.holdInvoiceHash) continue;
    watchOrderHoldInvoice(bot, order, order.holdInvoiceHash);
  }
}

export function watchOrderHoldInvoice(
  bot: { telegram: Bot["telegram"] },
  order: OrderRecord,
  hash: string,
) {
  watchHoldInvoice(
    order,
    hash,
    async (o) => {
      const didChangeStatus = await tryTransitionOrderStatus(
        o.id,
        [OrderStatus.WaitingEscrow],
        OrderStatus.Active,
      );
      if (!didChangeStatus) return;

      const { buyerId, sellerId } = getParties(o);
      const buyer = (await getUser(buyerId!))!;
      const seller = (await getUser(sellerId!))!;
      await notifyConfirmedEscrowFunding({ bot, buyer, seller, order: o });
    },
    async (o) => {
      const nonTerminalStatuses = Object.values(OrderStatus).filter(
        (status) => !TERMINAL_STATUSES.includes(status as any),
      );
      const didCancel = await tryTransitionOrderStatus(
        o.id,
        nonTerminalStatuses,
        OrderStatus.Cancelled,
      );
      if (!didCancel) return;

      const { buyerId, sellerId } = getParties(o);
      await notifyUser(bot, buyerId!, (d) => d.orderCancelled);
      await notifyUser(bot, sellerId!, (d) => d.orderCancelled);
    },
  );
}

export function startEscrowMonitor(bot: Bot) {
  runEvery(POLL_INTERVAL_MS, async () => {
    try {
      const pendingOrders = await selectOrdersWithStatus(
        OrderStatus.WaitingEscrow,
        OrderStatus.Unconfirmed,
      );
      if (pendingOrders.length === 0) return;

      let currentHeight: number;
      try {
        const tipRes = await fetchMempool("blocks/tip/height");
        if (!tipRes.ok) return;
        currentHeight = parseInt(await tipRes.text(), 10);
      } catch {
        return;
      }

      for (const order of pendingOrders) {
        await new Promise((res) => setTimeout(res, 500));
        await checkPendingEscrow(bot, order, currentHeight);
      }
    } catch (err) {
      console.error("Error en monitor de escrows:", err);
    }
  });
}

async function checkPendingEscrow(
  bot: Bot,
  order: OrderRecord,
  currentHeight: number,
) {
  if (!order.escrowAddress) return;

  const fundingInfo = await checkEscrowFunding(
    order.escrowAddress,
    currentHeight,
  );
  if (!fundingInfo) return;

  const expectedSats = getSellerDepositSats(order.amountSats);
  const { buyerId, sellerId } = getParties(order);
  const seller = (await getUser(sellerId!))!;
  const buyer = (await getUser(buyerId!))!;

  if (fundingInfo.totalFundedSats < expectedSats) {
    await handleUnderfunded(
      bot,
      order,
      fundingInfo,
      expectedSats,
      seller,
      buyer,
    );
    return;
  }

  notifiedPartial.delete(order.id);

  if (order.status === OrderStatus.WaitingEscrow && !fundingInfo.confirmed) {
    const didMarkUnconfirmed = await tryTransitionOrderStatus(
      order.id,
      [OrderStatus.WaitingEscrow],
      OrderStatus.Unconfirmed,
    );
    if (didMarkUnconfirmed) {
      await notifyUser(bot, seller, (d) =>
        d.escrowUnconfirmed(order.escrowAddress!),
      );
      await notifyUser(bot, buyer, (d) =>
        d.escrowUnconfirmed(order.escrowAddress!),
      );
    }
  }

  if (fundingInfo.confirmed && order.status !== OrderStatus.Active) {
    const didTransition = await tryTransitionOrderStatus(
      order.id,
      [OrderStatus.WaitingEscrow, OrderStatus.Unconfirmed],
      OrderStatus.Active,
    );
    if (!didTransition) return;

    await notifyConfirmedEscrowFunding({ bot, seller, buyer, order });
    await alertOverfunding(
      bot,
      order.id,
      sellerId,
      seller,
      fundingInfo.totalFundedSats,
      expectedSats,
    );
  }
}

export async function notifyConfirmedEscrowFunding({
  bot,
  seller,
  buyer,
  order,
}: {
  bot: { telegram: Bot["telegram"] };
  seller: UserRecord;
  buyer: UserRecord;
  order: OrderRecord;
}) {
  const sellerContact = "@" + escapeMarkdown(seller!.username);
  const buyerContact = "@" + escapeMarkdown(buyer!.username);
  await notifyUser(bot, seller, (d) =>
    d.escrowConfirmedSeller(buyerContact, order.id),
  );
  await notifyUser(bot, buyer, (d) =>
    d.escrowConfirmedBuyer(sellerContact, order.id),
  );
}

async function handleUnderfunded(
  bot: Bot,
  order: OrderRecord,
  fundingInfo: { totalFundedSats: number; utxoCount: number },
  expectedSats: number,
  seller: UserRecord | undefined,
  buyer: UserRecord | undefined,
) {
  if (order.status === OrderStatus.Unconfirmed) {
    if (fundingInfo.totalFundedSats === 0) {
      const didCancel = await tryTransitionOrderStatus(
        order.id,
        [OrderStatus.Unconfirmed],
        OrderStatus.Cancelled,
      );
      if (didCancel) {
        await notifyUser(
          bot,
          seller,
          (d) => d.orderCancelledTransactionDisappeared,
        );
        await notifyUser(
          bot,
          buyer,
          (d) => d.orderCancelledSellerDepositReverted,
        );
      }
    } else {
      const didTransition = await tryTransitionOrderStatus(
        order.id,
        [OrderStatus.Unconfirmed],
        OrderStatus.Refundable,
      );
      if (didTransition) {
        await notifyUser(bot, seller, (d) => d.tamperingDetected);
        await notifyUser(bot, buyer, (d) => d.orderCancelledDepositAltered);
      }
    }
    return;
  }

  if (fundingInfo.utxoCount >= 2) {
    notifiedPartial.delete(order.id);
    const didTransition = await tryTransitionOrderStatus(
      order.id,
      [OrderStatus.WaitingEscrow, OrderStatus.Unconfirmed],
      OrderStatus.Refundable,
    );
    if (didTransition) {
      await notifyUser(bot, seller, (d) =>
        d.escrowFundingFailed(
          fundingInfo.utxoCount,
          fundingInfo.totalFundedSats,
          expectedSats,
          order.id,
        ),
      );
      await notifyUser(bot, buyer, (d) => d.orderCancelledSellerFunding);
    }
  } else if (fundingInfo.utxoCount === 1 && !notifiedPartial.has(order.id)) {
    notifiedPartial.add(order.id);
    const remainingSats = expectedSats - fundingInfo.totalFundedSats;
    await notifyUser(bot, seller, (d) =>
      d.incompleteFunding(
        fundingInfo.totalFundedSats,
        expectedSats,
        remainingSats,
      ),
    );
  }
}

async function alertOverfunding(
  bot: Bot,
  orderId: string,
  sellerId: number | null | undefined,
  seller: UserRecord | undefined,
  totalFundedSats: number,
  expectedSats: number,
) {
  const excessSats = totalFundedSats - expectedSats;
  const ADMIN_GROUP_ID = process.env.ADMIN_GROUP_ID;
  if (excessSats <= 546 || !ADMIN_GROUP_ID) return;

  const sellerUsername = seller?.username
    ? escapeMarkdown(seller.username)
    : `ID: ${sellerId}`;
  await bot.telegram.sendMessage(
    ADMIN_GROUP_ID,
    `⚠️ *ALERTA DE SOBRE-FONDEO*\n\n` +
      `El vendedor @${sellerUsername} ha enviado más fondos de los solicitados en la orden \`${orderId}\`.\n\n` +
      `Esperado: \`${expectedSats}\` sats\n` +
      `Recibido: \`${totalFundedSats}\` sats\n` +
      `Exceso a recuperar: \`${excessSats}\` sats\n\n` +
      `_Nota: El exceso será enviado a la billetera de comisiones del bot al finalizar la orden (ejecución de /release). Contacte al usuario para coordinar el reembolso._`,
    { parse_mode: "Markdown" },
  );
}

export function startOrderTimeoutsMonitor(bot: Bot) {
  runEvery(POLL_INTERVAL_MS, async () => {
    try {
      const now = Date.now();
      await cancelExpiredPending(bot, now - TWENTY_FOUR_HOURS_MS);
      await republishTakerTimeouts(bot, now - FIFTEEN_MINUTES_MS);
      await cancelMakerTimeouts(bot, now - FIFTEEN_MINUTES_MS);
      await handleEscrowTimeouts(bot, now - ONE_HOUR_MS);
    } catch (err) {
      console.error("Error en monitor de timeouts:", err);
    }
  });
}

async function cancelExpiredPending(bot: Bot, createdBefore: number) {
  const expiredPending = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.status, OrderStatus.Pending),
        lte(orders.createdAt, createdBefore),
      ),
    );

  for (const order of expiredPending) {
    const didCancel = await tryTransitionOrderStatus(
      order.id,
      [OrderStatus.Pending],
      OrderStatus.Cancelled,
    );
    if (!didCancel) continue;

    await removeOrderFromChannel(bot.telegram, order.channelMessageId);
    await notifyUser(bot, order.creatorId, (d) =>
      d.orderExpiredCancelled(order.id),
    );
  }
}

async function republishTakerTimeouts(bot: Bot, updatedBefore: number) {
  const takerTimeouts = await selectOrdersWhere(
    OrderStatus.WaitingTakerConfirmation,
    updatedBefore,
  );

  for (const order of takerTimeouts) {
    const takerIdToNotify = order.takerId; // Respaldar antes de que republish lo ponga en null
    const republished = await republishOrderSilently(bot, order.id);

    if (republished && takerIdToNotify) {
      await notifyUser(bot, takerIdToNotify, (d) =>
        d.takerTimeoutNotifyTaker(order.id),
      );
    }
  }
}

async function cancelMakerTimeouts(bot: Bot, updatedBefore: number) {
  const makerTimeouts = await selectOrdersWhere(
    OrderStatus.WaitingMakerConfirmation,
    updatedBefore,
  );

  for (const order of makerTimeouts) {
    const didCancel = await tryTransitionOrderStatus(
      order.id,
      [OrderStatus.WaitingMakerConfirmation],
      OrderStatus.Cancelled,
    );
    if (!didCancel) continue;

    await notifyUser(bot, order.creatorId, (d) =>
      d.makerTimeoutNotifyMaker(order.id),
    );
    await notifyUser(bot, order.takerId!, (d) =>
      d.makerTimeoutNotifyTaker(order.id),
    );
  }
}

async function handleEscrowTimeouts(bot: Bot, updatedBefore: number) {
  const escrowTimeouts = await selectOrdersWhere(
    OrderStatus.WaitingEscrow,
    updatedBefore,
  );

  for (const order of escrowTimeouts) {
    const funding = await checkEscrowFunding(order.escrowAddress!);

    if (funding && funding.totalFundedSats > 0) {
      const { sellerId, buyerId } = getParties(order);
      const didTransition = await tryTransitionOrderStatus(
        order.id,
        [OrderStatus.WaitingEscrow],
        OrderStatus.Refundable,
      );
      if (didTransition) {
        await notifyUser(bot, sellerId!, (d) => d.fundingExpired);
        await notifyUser(bot, buyerId!, (d) => d.orderCancelled);
      }
      continue;
    }

    await cancelExpiredEscrow({
      bot,
      order,
    });
  }
}

export async function cancelExpiredEscrow({
  order,
  bot,
}: {
  order: OrderRecord;
  bot: BotContext | Bot;
}) {
  if (order.type === "SELL") {
    const didCancel = await tryTransitionOrderStatus(
      order.id,
      [OrderStatus.WaitingEscrow],
      OrderStatus.Cancelled,
    );
    if (didCancel) {
      await notifyUser(bot, order.creatorId, (d) =>
        d.makerTimeoutNotifyMaker(order.id),
      );
      await notifyUser(bot, order.takerId!, (d) =>
        d.makerTimeoutNotifyTaker(order.id),
      );
    }
    return;
  }

  const takerIdToNotify = order.takerId;
  const republished = await republishOrderSilently(bot as Bot, order.id, [
    OrderStatus.WaitingEscrow,
  ]);

  if (republished) {
    await notifyUser(bot, order.creatorId, (d) => d.sellerDidNotFund(order.id));
    if (takerIdToNotify) {
      await notifyUser(bot, takerIdToNotify, (d) =>
        d.takerTimeoutNotifyTaker(order.id),
      );
    }
  }
}
