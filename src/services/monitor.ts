import { and, eq, lte, or } from "drizzle-orm";
import { db } from "../db/index.js";
import { orders } from "../db/schema.js";
import {
  checkEscrowFunding,
  getMempoolApiPath,
} from "../core/bitcoin/index.js";
import { getUserDict } from "../locales/index.js";
import { Telegraf } from "telegraf";
import { type BotContext } from "../types.js";
import { getUser } from "../db/users.js";
import { tryTransitionOrderStatus } from "../db/orders.js";
import { escapeMarkdown } from "../utils/format.js";
import { republishOrderSilently } from "../handlers/orderHandler.js";
import { getParties } from "../utils/order.js";
import { safeNotify } from "../utils/telegram.js";
import { OrderStatus } from "../shared/constants.js";
import { getBotFeePercent } from "../config/fees.js";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const PUBLIC_CHANNEL_ID = process.env.PUBLIC_CHANNEL_ID;
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
let isCheckingTimeouts = false;

export function startEscrowMonitor(bot: Telegraf<BotContext>) {
  setInterval(async () => {
    const pendingOrders = await db
      .select()
      .from(orders)
      .where(
        or(
          eq(orders.status, OrderStatus.WAITING_ESCROW),
          eq(orders.status, OrderStatus.UNCONFIRMED),
        ),
      );

    if (pendingOrders.length === 0) return;

    let currentHeight = 0;
    try {
      const tipRes = await fetch(getMempoolApiPath("blocks/tip/height"));
      if (tipRes.ok) currentHeight = parseInt(await tipRes.text(), 10);
    } catch (e) {
      return;
    }

    for (const order of pendingOrders) {
      await new Promise((res) => setTimeout(res, 500));
      if (!order.escrowAddress) continue;

      const fundingInfo = await checkEscrowFunding(
        order.escrowAddress,
        currentHeight,
      );
      if (!fundingInfo) continue;

      const botFeePercent = getBotFeePercent(order.amountSats);
      const sellerFeeSats = Math.floor(
        order.amountSats * (botFeePercent / 2 / 100),
      );
      const expectedSats = order.amountSats + sellerFeeSats;
      if (fundingInfo.totalFundedSats < expectedSats) continue;

      const { buyerId, sellerId } = getParties(order);

      if (order.status === OrderStatus.WAITING_ESCROW && !fundingInfo.confirmed) {
        await db
          .update(orders)
          .set({ status: OrderStatus.UNCONFIRMED, fundingTxid: fundingInfo.txid })
          .where(eq(orders.id, order.id));

        const seller = await getUser(sellerId!);
        const buyer = await getUser(buyerId!);

        const dictSeller = getUserDict(seller?.language);
        const dictBuyer = getUserDict(buyer?.language);
        await bot.telegram.sendMessage(
          sellerId!,
          dictSeller.escrowUnconfirmed(fundingInfo.txid),
          { parse_mode: "Markdown" },
        );
        await bot.telegram.sendMessage(
          buyer!.telegramId,
          dictBuyer.escrowUnconfirmed(fundingInfo.txid),
          { parse_mode: "Markdown" },
        );
      }
      if (fundingInfo.confirmed && order.status !== OrderStatus.ACTIVE) {
        const didTransition = await tryTransitionOrderStatus(
          order.id,
          [OrderStatus.WAITING_ESCROW, OrderStatus.UNCONFIRMED],
          OrderStatus.ACTIVE,
          { fundingTxid: fundingInfo.txid },
        );

        if (!didTransition) continue;

        const seller = await getUser(sellerId!);
        const buyer = await getUser(buyerId!);
        const sellerContact = "@" + escapeMarkdown(seller!.username);
        const buyerContact = "@" + escapeMarkdown(buyer!.username);

        await safeNotify(bot, seller, (dict) =>
          dict.escrowConfirmedSeller(buyerContact, order.id),
        );
        await safeNotify(bot, buyer, (dict) =>
          dict.escrowConfirmedBuyer(sellerContact, order.id),
        );

        const excessSats = fundingInfo.totalFundedSats - expectedSats;
        if (excessSats > 546) {
          const ADMIN_GROUP_ID = process.env.ADMIN_GROUP_ID;
          if (ADMIN_GROUP_ID) {
            const sellerUsername = seller?.username
              ? escapeMarkdown(seller.username)
              : `ID: ${sellerId}`;
            await bot.telegram.sendMessage(
              ADMIN_GROUP_ID,
              `⚠️ *ALERTA DE SOBRE-FONDEO*\n\n` +
                `El vendedor @${sellerUsername} ha enviado más fondos de los solicitados en la orden \`${order.id}\`.\n\n` +
                `Esperado: \`${expectedSats}\` sats\n` +
                `Recibido: \`${fundingInfo.totalFundedSats}\` sats\n` +
                `Exceso a recuperar: \`${excessSats}\` sats\n\n` +
                `_Nota: El exceso será enviado a la billetera de comisiones del bot al finalizar la orden (ejecución de /release). Contacte al usuario para coordinar el reembolso._`,
              { parse_mode: "Markdown" },
            );
          }
        }
      }
    }
  }, 60000);
}
export function startOrderTimeoutsMonitor(bot: Telegraf<BotContext>) {
  setInterval(async () => {
    if (isCheckingTimeouts) return;
    isCheckingTimeouts = true;

    try {
      const now = Date.now();
      const expirationThreshold = now - TWENTY_FOUR_HOURS_MS;
      const timeoutThreshold = now - FIFTEEN_MINUTES_MS;

      const expiredPending = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.status, OrderStatus.PENDING),
            lte(orders.createdAt, expirationThreshold),
          ),
        );

      for (const order of expiredPending) {
        const didCancel = await tryTransitionOrderStatus(
          order.id,
          [OrderStatus.PENDING],
          OrderStatus.CANCELLED,
        );
        if (!didCancel) continue;

        if (order.channelMessageId && PUBLIC_CHANNEL_ID) {
          try {
            await bot.telegram.deleteMessage(
              PUBLIC_CHANNEL_ID,
              order.channelMessageId,
            );
          } catch (e) {}
        }

        await safeNotify(bot, order.creatorId, (dict) =>
          dict.orderExpiredCancelled(order.id),
        );
      }

      const takerTimeouts = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.status, OrderStatus.WAITING_TAKER_CONFIRMATION),
            lte(orders.updatedAt, timeoutThreshold),
          ),
        );

      for (const order of takerTimeouts) {
        const takerIdToNotify = order.takerId; // Respaldar antes de que republish lo ponga en null
        const republished = await republishOrderSilently(bot, order.id);

        if (republished && takerIdToNotify)
          await safeNotify(bot, takerIdToNotify, (dict) =>
            dict.takerTimeoutNotifyTaker(order.id),
          );
      }

      const makerTimeouts = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.status, OrderStatus.WAITING_MAKER_CONFIRMATION),
            lte(orders.updatedAt, timeoutThreshold),
          ),
        );

      for (const order of makerTimeouts) {
        const didCancel = await tryTransitionOrderStatus(
          order.id,
          [OrderStatus.WAITING_MAKER_CONFIRMATION],
          OrderStatus.CANCELLED,
        );
        if (!didCancel) continue;

        await safeNotify(bot, order.creatorId, (dict) =>
          dict.makerTimeoutNotifyMaker(order.id),
        );
        await safeNotify(bot, order.takerId!, (dict) =>
          dict.makerTimeoutNotifyTaker(order.id),
        );
      }
    } catch (err) {
      console.error("Error en monitor de timeouts:", err);
    } finally {
      isCheckingTimeouts = false;
    }
  }, 60000);
}
