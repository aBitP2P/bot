import { mysqlTable, varchar, text, int, bigint, double, index } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  telegramId: bigint("telegram_id", { mode: "number" }).primaryKey(),
  username: varchar("username", { length: 255 }).notNull(),
  language: varchar("language", { length: 10 }).notNull().default("es"),
  tradesCount: int("trades_count").notNull().default(0),
  rating: double("rating").notNull().default(0),
  pubkey: text("pubkey"),
  encryptedWif: text("encrypted_wif"),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});

export const orders = mysqlTable("orders", {
  id: varchar("id", { length: 64 }).primaryKey(),
  type: varchar("type", { length: 10 }).notNull(),
  creatorId: bigint("creator_id", { mode: "number" }).notNull(),
  takerId: bigint("taker_id", { mode: "number" }),
  status: varchar("status", { length: 64 }).notNull().default("PENDING"),

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

  buyerPubkey: text("buyer_pubkey"),
  sellerPubkey: text("seller_pubkey"),

  amountSats: bigint("amount_sats", { mode: "number" }).notNull().default(0),
  escrowAddress: varchar("escrow_address", { length: 255 }),
  witnessScript: text("witness_script"),
  fundingTxid: varchar("funding_txid", { length: 128 }),
  payoutTxid: varchar("payout_txid", { length: 128 }),

  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
}, (table) => ({
  statusIdx: index("status_idx").on(table.status),
  creatorIdx: index("creator_idx").on(table.creatorId),
  takerIdx: index("taker_idx").on(table.takerId),
}));

export const counters = mysqlTable('counters', {
  name: varchar('name', { length: 64 }).primaryKey(),
  value: int('value').notNull().default(0),
});