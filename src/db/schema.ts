import { mysqlTable, varchar, text, int, bigint, double, index, uniqueIndex } from "drizzle-orm/mysql-core";
import { OrderStatus, SettlementMethodType } from "../shared/constants.js";

export const users = mysqlTable("users", {
  telegramId: bigint("telegram_id", { mode: "number" }).primaryKey(),
  username: varchar("username", { length: 255 }).notNull(),
  language: varchar("language", { length: 10 }).notNull().default("es"),

  tradesCount: int("trades_count").notNull().default(0),
  rating: double("rating").notNull().default(0),
  ratingCount: int("rating_count").notNull().default(0),
  ratingSum: int("rating_sum").notNull().default(0),

  customFee: double("custom_fee"), 
  
  xpub: text("xpub"),
  fingerprint: text("fingerprint"),
  encryptedMnemonic: text("encrypted_mnemonic"),

  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});

export const orders = mysqlTable("orders", {
  id: varchar("id", { length: 64 }).primaryKey(),
  type: varchar("type", { length: 10 }).notNull(),
  creatorId: bigint("creator_id", { mode: "number" }).notNull(),
  takerId: bigint("taker_id", { mode: "number" }),
  status: varchar("status", { length: 64 }).notNull().default(OrderStatus.Pending),

  amountFiat: varchar("amount_fiat", { length: 64 }).notNull(),
  fiatCode: varchar("fiat_code", { length: 10 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 255 }).notNull(),
  margin: double("margin").notNull(),

  fiatAmountLocked: double("fiat_amount_locked"),

  buyerAddress: varchar("buyer_address", { length: 255 }),
  refundAddress: varchar("refund_address", { length: 255 }),
  cancelRequestedBy: bigint("cancel_requested_by", { mode: "number" }),
  channelMessageId: int("channel_message_id"),
  disputeAdminId: bigint("dispute_admin_id", { mode: "number" }),
  disputeResolution: varchar("dispute_resolution", { length: 32 }),

  buyerXpub: text("buyer_xpub"),
  sellerXpub: text("seller_xpub"),
  escrowIndex: int("escrow_index").default(0),

  amountSats: bigint("amount_sats", { mode: "number" }).notNull().default(0),
  escrowAddress: varchar("escrow_address", { length: 255 }),
  witnessScript: text("witness_script"),
  payoutTxid: varchar("payout_txid", { length: 128 }),
  externalPsbt: text("external_psbt"),

  settlementMethod: varchar("settlement_method", { length: 16 }).notNull().default(SettlementMethodType.OnChain),

  holdInvoiceHash: varchar("hold_invoice_hash", { length: 64 }), 
  holdInvoiceRequest: text("hold_invoice_request"),              
  holdInvoicePreimageEncrypted: text("hold_invoice_preimage_enc"),    
  payoutInvoice: text("payout_invoice"),

  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now())
}, (table) => [
  index("status_idx").on(table.status),
  index("creator_idx").on(table.creatorId),
  index("taker_idx").on(table.takerId),
]);

export const counters = mysqlTable('counters', {
  name: varchar('name', { length: 255 }).primaryKey(),
  value: int('value').notNull().default(0),
});

export const orderRatings = mysqlTable("order_ratings", {
  id: varchar("id", { length: 64 }).primaryKey(),
  orderId: varchar("order_id", { length: 64 }).notNull(),
  raterId: bigint("rater_id", { mode: "number" }).notNull(),
  rateeId: bigint("ratee_id", { mode: "number" }).notNull(),
  stars: int("stars").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
}, (table) => [
  uniqueIndex("unique_rating_idx").on(table.orderId, table.raterId),
]);