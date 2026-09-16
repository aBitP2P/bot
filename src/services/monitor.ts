import { and, eq, lte, or } from "drizzle-orm";
import { db } from "../db/index.js";
import { orders, users } from "../db/schema.js";
import {
  checkEscrowFunding,
  getMempoolApiPath,
} from "../core/bitcoin/index.js";
import { dictionaries, type Language } from "../locales/index.js";
import { Telegraf } from "telegraf";
import { type BotContext } from "../types.js";
import { getUser } from "../db/users.js";
import { tryTransitionOrderStatus } from "../db/orders.js";
import { escapeMarkdown } from "../utils/format.js";
import { republishOrderSilently } from "../handlers/orderHandler.js";

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
          eq(orders.status, "WAITING_ESCROW"),
          eq(orders.status, "UNCONFIRMED"),
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
      await new Promise(res => setTimeout(res, 500));
      if (!order.escrowAddress) continue;

      const fundingInfo = await checkEscrowFunding(
        order.escrowAddress,
        currentHeight,
      );
      if (!fundingInfo) continue;

      const totalBotFee = parseFloat(process.env.BOT_FEE!);
      const sellerFeeSats = Math.floor(
        order.amountSats * (totalBotFee / 2 / 100),
      );
      const expectedSats = order.amountSats + sellerFeeSats;
      if (fundingInfo.totalFundedSats < expectedSats) continue;

      const isCreatorSelling = order.type === "SELL";
      const sellerId = isCreatorSelling ? order.creatorId : order.takerId;
      const buyerId = isCreatorSelling ? order.takerId : order.creatorId;

      if (order.status === "WAITING_ESCROW" && !fundingInfo.confirmed) {
        await db
          .update(orders)
          .set({ status: "UNCONFIRMED", fundingTxid: fundingInfo.txid })
          .where(eq(orders.id, order.id));

        const seller = await getUser(sellerId!);
        const buyer = await getUser(buyerId!);

        const dictSeller = dictionaries[(seller?.language as Language) || "es"];
        const dictBuyer = dictionaries[(buyer?.language as Language) || "es"];
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
      if (fundingInfo.confirmed && order.status !== "ACTIVE") {
        const didTransition = await tryTransitionOrderStatus(
          order.id,
          ["WAITING_ESCROW", "UNCONFIRMED"],
          "ACTIVE",
          { fundingTxid: fundingInfo.txid },
        );

        if (!didTransition) continue;

        const seller = await getUser(sellerId!)
        const buyer = await getUser(buyerId!);

        const dictSeller = dictionaries[(seller?.language as Language) || "es"];
        const dictBuyer = dictionaries[(buyer?.language as Language) || "es"];

        const sellerContact = "@" + escapeMarkdown(seller!.username);
        const buyerContact = "@" + escapeMarkdown(buyer!.username);
        await bot.telegram.sendMessage(
          sellerId!,
          dictSeller.escrowConfirmedSeller(buyerContact, order.id),
          { parse_mode: "Markdown" },
        );

        await bot.telegram.sendMessage(
          buyerId!,
          dictBuyer.escrowConfirmedBuyer(sellerContact, order.id),
          { parse_mode: "Markdown" },
        );

        const excessSats = fundingInfo.totalFundedSats - expectedSats;
        if (excessSats > 546) { 
          const ADMIN_GROUP_ID = process.env.ADMIN_GROUP_ID;
          if (ADMIN_GROUP_ID) {
            const sellerUsername = seller?.username ? escapeMarkdown(seller.username) : `ID: ${sellerId}`;
            await bot.telegram.sendMessage(
              ADMIN_GROUP_ID,
              `⚠️ *ALERTA DE SOBRE-FONDEO*\n\n` +
              `El vendedor @${sellerUsername} ha enviado más fondos de los solicitados en la orden \`${order.id}\`.\n\n` +
              `Esperado: \`${expectedSats}\` sats\n` +
              `Recibido: \`${fundingInfo.totalFundedSats}\` sats\n` +
              `Exceso a recuperar: \`${excessSats}\` sats\n\n` +
              `_Nota: El exceso será enviado a la billetera de comisiones del bot al finalizar la orden (ejecución de /release). Contacte al usuario para coordinar el reembolso._`,
              { parse_mode: "Markdown" }
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

      const expiredPending = await db.select().from(orders).where(
        and(eq(orders.status, "PENDING"), lte(orders.createdAt, expirationThreshold))
      );

      for (const order of expiredPending) {
        const didCancel = await tryTransitionOrderStatus(order.id, ["PENDING"], "CANCELLED");
        if (!didCancel) continue;

        if (order.channelMessageId && PUBLIC_CHANNEL_ID) {
          try { await bot.telegram.deleteMessage(PUBLIC_CHANNEL_ID, order.channelMessageId); } catch (e) { }
        }

        const creator = await getUser(order.creatorId);
        if (creator) {
          const dict = dictionaries[(creator.language as Language) || "es"];
          try { await bot.telegram.sendMessage(order.creatorId, dict.orderExpiredCancelled(order.id), { parse_mode: "Markdown" }); } catch (e) { }
        }
      }

      const takerTimeouts = await db.select().from(orders).where(
        and(eq(orders.status, "WAITING_TAKER_CONFIRMATION"), lte(orders.updatedAt, timeoutThreshold))
      );

      for (const order of takerTimeouts) {
        const takerIdToNotify = order.takerId; // Respaldar antes de que republish lo ponga en null
        const republished = await republishOrderSilently(bot, order.id);
        
        if (republished && takerIdToNotify) {
          const taker = await getUser(takerIdToNotify);
          if (taker) {
            const dict = dictionaries[(taker.language as Language) || "es"];
            try { 
              await bot.telegram.sendMessage(takerIdToNotify, dict.takerTimeoutNotifyTaker(order.id), { parse_mode: "Markdown" }); 
            } catch (e) { }
          }
        }
      }

      const makerTimeouts = await db.select().from(orders).where(
        and(eq(orders.status, "WAITING_MAKER_CONFIRMATION"), lte(orders.updatedAt, timeoutThreshold))
      );

      for (const order of makerTimeouts) {
        const didCancel = await tryTransitionOrderStatus(order.id, ["WAITING_MAKER_CONFIRMATION"], "CANCELLED");
        if (!didCancel) continue;

        const maker = await getUser(order.creatorId);
        const taker = await getUser(order.takerId!);
        
        if (maker) {
          const makerDict = dictionaries[(maker.language as Language) || "es"];
          try { await bot.telegram.sendMessage(order.creatorId, makerDict.makerTimeoutNotifyMaker(order.id), { parse_mode: "Markdown" }); } catch (e) { }
        }

        if (taker) {
          const takerDict = dictionaries[(taker.language as Language) || "es"];
          try { await bot.telegram.sendMessage(order.takerId!, takerDict.makerTimeoutNotifyTaker(order.id), { parse_mode: "Markdown" }); } catch (e) { }
        }
      }

    } catch (err) {
      console.error("Error en monitor de timeouts:", err);
    } finally {
      isCheckingTimeouts = false;
    }
  }, 60000);
}