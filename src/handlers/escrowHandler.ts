import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { getOrder } from "../db/orders.js";
import { loans, orders } from "../db/schema.js";
import { getUser } from "../db/users.js";
import { getUserDict } from "../locales/index.js";
import type { BotContext } from "../types.js";
import { generateEscrow } from "../core/bitcoin/index.js";
import QRCode from "qrcode";
import { getLoanParties, getParties } from "../utils/parties.js";
import { getBotFeePercent } from "../config/fees.js";
import { getLoan } from "../db/loans.js";

export async function initializeEscrow(ctx: BotContext, orderId: string) {
  const order = await getOrder(orderId);
  if (!order || !order.amountSats) return;

  const { buyerId, sellerId } = getParties(order);

  const buyer = await getUser(buyerId!);
  const seller = await getUser(sellerId!);
  const dictSeller = getUserDict(seller?.language);
  const buyerPubkey = buyer?.pubkey;
  const sellerPubkey = seller?.pubkey;

  if (!buyerPubkey || !sellerPubkey) {
    return ctx.reply(dictSeller.missingPubkeys);
  }

  const { address, witnessScript } = generateEscrow(
    buyerPubkey,
    sellerPubkey,
    order.id,
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
      buyerPubkey,
      sellerPubkey,
      escrowAddress: address,
      witnessScript: witnessScript,
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

export async function initializeLoanEscrow(ctx: BotContext, loanId: string) {
  const loan = await getLoan(loanId);
  if (!loan || !loan.collateralSats) return;

  const { lenderId, borrowerId } = getLoanParties(loan);

  const borrower = await getUser(borrowerId!);
  const lender = await getUser(lenderId!);
  const dictBorrower = getUserDict(borrower?.language);
  const dictLender = getUserDict(lender?.language);

  const borrowerPubkey = borrower?.pubkey;
  const lenderPubkey = lender?.pubkey;

  if (!borrowerPubkey || !lenderPubkey) {
    return ctx.reply(ctx.dict.missingPubkeys);
  }

  const { address, witnessScript } = generateEscrow(
    lenderPubkey, 
    borrowerPubkey,
    loan.id
  );

  const baseSats = loan.collateralSats;
  const botFeePercent = getBotFeePercent(baseSats);
  const borrowerFeeSats = Math.floor(baseSats * (botFeePercent / 100));
  const satsToDeposit = baseSats + borrowerFeeSats;

  await db
    .update(loans)
    .set({
      borrowerPubkey,
      lenderPubkey,
      escrowAddress: address,
      witnessScript: witnessScript,
    })
    .where(eq(loans.id, loanId));

  const totalBtc = (satsToDeposit / 100_000_000).toFixed(8);
  const bitcoinUri = `bitcoin:${address}?amount=${totalBtc}`;

  const qrBuffer = await QRCode.toBuffer(bitcoinUri, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 400,
    color: { dark: "#000000", light: "#ffffff" },
  });

  await ctx.telegram.sendPhoto(
    borrowerId!,
    { source: qrBuffer },
    {
      caption: dictBorrower.askBorrowerEscrow(satsToDeposit, address),
      parse_mode: "Markdown",
    }
  );

  await ctx.telegram.sendMessage(
    lenderId!,
    dictLender.waitBorrowerDeposit,
    { parse_mode: "Markdown" }
  );
}