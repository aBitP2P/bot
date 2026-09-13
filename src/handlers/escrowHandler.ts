import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { getOrder } from "../db/orders.js";
import { orders } from "../db/schema.js";
import { getUser } from "../db/users.js";
import { dictionaries, type Language } from "../locales/index.js";
import type { BotContext } from "../types.js";
import { generateEscrow } from "../core/bitcoin/index.js";
import { getRateInfoFor } from "../utils/price.js";
import QRCode from "qrcode";

export async function initializeEscrow(ctx: BotContext, orderId: string) {
  const order = await getOrder(orderId);
  if (!order) return;

  const isCreatorSelling = order.type === "SELL";
  const sellerId = isCreatorSelling ? order.creatorId : order.takerId;
  const buyerId = isCreatorSelling ? order.takerId : order.creatorId;

  const buyer = await getUser(buyerId!);
  const seller = await getUser(sellerId!);
  const sellerLang = (seller?.language as Language) || "es";
  const buyerPubkey = buyer?.pubkey;
  const sellerPubkey = seller?.pubkey;

  if (!buyerPubkey || !sellerPubkey) {
    return ctx.reply(dictionaries[sellerLang].missingPubkeys);
  }

  const { address, witnessScript } = generateEscrow(
    buyerPubkey,
    sellerPubkey,
    order.id,
  );

  const fiatAmount = order.fiatAmountLocked!;
  const { satsAmount: baseSats } = await getRateInfoFor(
    fiatAmount,
    order.fiatCode,
    order.margin,
  );

  const totalBotFee = parseFloat(process.env.BOT_FEE!);
  const sellerFeeSats = Math.floor(baseSats * (totalBotFee / 2 / 100));

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
      buyerPubkey,
      sellerPubkey,
      escrowAddress: address,
      witnessScript: witnessScript,
      amountSats: baseSats,
      fiatAmountLocked: fiatAmount,
    })
    .where(eq(orders.id, orderId));

  await ctx.telegram.sendPhoto(
    sellerId!,
    { source: qrBuffer },
    {
      caption: dictionaries[sellerLang].askSellerEscrow(satsToDeposit, address),
      parse_mode: "Markdown",
    },
  );
}
