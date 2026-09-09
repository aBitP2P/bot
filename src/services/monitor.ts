import { eq, or } from "drizzle-orm";
import { db } from "../db/index.js";
import { orders, users } from "../db/schema.js";
import { checkEscrowFunding } from "../utils/bitcoin.js";
import { dictionaries, type Language } from "../locales/index.js";
import { Telegraf } from "telegraf";
import { type BotContext } from "../types.js";
import { getUser } from "../db/users.js";
import { tryTransitionOrderStatus } from "../db/orders.js";

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

    for (const order of pendingOrders) {
      if (!order.escrowAddress) continue;

      const fundingInfo = await checkEscrowFunding(order.escrowAddress);
      if (!fundingInfo) continue;

      const totalBotFee = parseFloat(process.env.BOT_FEE || "0.8");
      const sellerFeeSats = Math.floor(
        order.amountSats * (totalBotFee / 2 / 100),
      );
      const expectedSats = order.amountSats + sellerFeeSats;
      if (fundingInfo.totalFundedSats < expectedSats) continue;

      if (order.status === "WAITING_ESCROW" && !fundingInfo.confirmed) {
        await db
          .update(orders)
          .set({ status: "UNCONFIRMED", fundingTxid: fundingInfo.txid })
          .where(eq(orders.id, order.id));

        const isCreatorSelling = order.type === "SELL";
        const sellerId = isCreatorSelling ? order.creatorId : order.takerId;

        const seller = await getUser(sellerId!);
        const dictSeller = dictionaries[(seller?.language as Language) || "es"];

        await bot.telegram.sendMessage(
          sellerId!,
          dictSeller.escrowUnconfirmed(fundingInfo.txid),
          { parse_mode: "Markdown" },
        );
      }

      // 2. Transacción Confirmada (1-conf)
      if (fundingInfo.confirmed && order.status !== "ACTIVE") {
        const didTransition = await tryTransitionOrderStatus(
            order.id, 
            ["WAITING_ESCROW", "UNCONFIRMED"], 
            "ACTIVE", 
            { fundingTxid: fundingInfo.txid }
        );

        if (!didTransition) continue;

        const isCreatorSelling = order.type === "SELL";
        const sellerId = isCreatorSelling ? order.creatorId : order.takerId;
        const buyerId = isCreatorSelling ? order.takerId : order.creatorId;

        const [seller] = await db
          .select()
          .from(users)
          .where(eq(users.telegramId, sellerId!))
          .limit(1);
        const [buyer] = await db
          .select()
          .from(users)
          .where(eq(users.telegramId, buyerId!))
          .limit(1);

        const dictSeller = dictionaries[(seller?.language as Language) || "es"];
        const dictBuyer = dictionaries[(buyer?.language as Language) || "es"];

        const sellerProfile = await bot.telegram
          .getChat(sellerId!)
          .catch(() => null);
        const buyerProfile = await bot.telegram
          .getChat(buyerId!)
          .catch(() => null);

        // Si tiene username, enviamos el @username completo. Si no, un hipervínculo con tg://user
        const sellerContact =
          sellerProfile?.type === "private" && sellerProfile.username
            ? `@${sellerProfile.username}`
            : `[Vendedor](tg://user?id=${sellerId})`;

        const buyerContact =
          buyerProfile?.type === "private" && buyerProfile.username
            ? `@${buyerProfile.username}`
            : `[Comprador](tg://user?id=${buyerId})`;

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
      }
    }
  }, 60000);
}
