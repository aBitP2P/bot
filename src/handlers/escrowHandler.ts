import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { getOrder } from "../db/orders.js";
import { orders } from "../db/schema.js";
import { getUser } from "../db/users.js";
import { getUserDict } from "../locales/index.js";
import type { BotContext } from "../types.js";
import { generateEscrow, getNextDerivationIndex, getPairCounterKey } from "../core/bitcoin/index.js";
import QRCode from "qrcode";
import { getParties } from "../utils/order.js";
import { getBotFeePercent } from "../config/fees.js";

export async function initializeEscrow(ctx: BotContext, orderId: string) {
  const order = await getOrder(orderId);
  if (!order || !order.amountSats) return;

  const { buyerId, sellerId } = getParties(order);

  const buyer = await getUser(buyerId!);
  const seller = await getUser(sellerId!);
  const dictSeller = getUserDict(seller?.language);
  const buyerXpub = buyer?.xpub;
  const sellerXpub = seller?.xpub;

  if (!buyerXpub || !sellerXpub) {
    return ctx.reply(dictSeller.missingPubkeys);
  }

  const pairKey = getPairCounterKey(buyerXpub, sellerXpub);
  const escrowIndex = await getNextDerivationIndex(pairKey);

  const { address, witnessScript } = generateEscrow(
    buyerXpub,
    sellerXpub,
    escrowIndex,
  );

  const baseSats = order.amountSats;

  const botFeePercent = getBotFeePercent(baseSats);
  const sellerFeeSats = Math.floor(baseSats * (botFeePercent / 2 / 100));

  const satsToDeposit = baseSats + sellerFeeSats;

  const totalBtc = (satsToDeposit / 100_000_000).toFixed(8);
  const bitcoinUri = `bitcoin:${address}?amount=${totalBtc}`;

  const qrBuffer = await QRCode.toBuffer(bitcoinUri, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 400,
    color: { dark: "#000000", light: "#ffffff" },
  });

  await db
    .update(orders)
    .set({
      buyerXpub: buyer.xpub,
      sellerXpub: seller.xpub,
      escrowIndex,
      escrowAddress: address,
      witnessScript,
    })
    .where(eq(orders.id, orderId));

  await ctx.telegram.sendPhoto(
    sellerId!,
    { source: qrBuffer },
    {
      caption: dictSeller.askSellerEscrow(satsToDeposit, address),
      parse_mode: "Markdown",
    },
  );
}
