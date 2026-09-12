export const Strings = {
  ORDER_CHANNEL_TAG: "@aBitP2PExchange",
  GENERAL_CHAT_TAG: "@aBitP2PGeneral\\_es",
};

export const OrderStatus = {
  PENDING: "PENDING",
  WAITING_TAKER_CONFIRMATION: "WAITING_TAKER_CONFIRMATION",
  WAITING_MAKER_CONFIRMATION: "WAITING_MAKER_CONFIRMATION",
  WAITING_ESCROW: "WAITING_ESCROW",
  UNCONFIRMED: "UNCONFIRMED",
  ACTIVE: "ACTIVE",
  CANCEL_REQUESTED: "CANCEL_REQUESTED",
  FIAT_SENT: "FIAT_SENT",
  RELEASABLE: "RELEASABLE",
  REFUNDABLE: "REFUNDABLE",
  DISPUTE: "DISPUTE",
  COMPLETED: "COMPLETED",
  REFUNDED: "REFUNDED",
  CANCELLED: "CANCELLED",
} as const;

export type OrderStatusType = keyof typeof OrderStatus;

export const TERMINAL_STATUSES = [
  OrderStatus.RELEASABLE,
  OrderStatus.REFUNDABLE,
  OrderStatus.COMPLETED,
  OrderStatus.CANCELLED,
  OrderStatus.REFUNDED,
  OrderStatus.DISPUTE,
];

export const OrderStatusLabelsES: Record<string, string> = {
  [OrderStatus.PENDING]: "⏳ Pendiente",
  [OrderStatus.WAITING_TAKER_CONFIRMATION]: "⏳ Esperando confirmación",
  [OrderStatus.WAITING_MAKER_CONFIRMATION]: "⏳ Esperando confirmación",
  [OrderStatus.WAITING_ESCROW]: "📥 Esperando depósito",
  [OrderStatus.UNCONFIRMED]: "🔄 Confirmando en la red",
  [OrderStatus.ACTIVE]: "🟢 Activa",
  [OrderStatus.CANCEL_REQUESTED]: "⚠️ Cancelación solicitada",
  [OrderStatus.FIAT_SENT]: "💸 Fiat enviado",
  [OrderStatus.RELEASABLE]: "🔓 Lista para liberar",
  [OrderStatus.REFUNDABLE]: "↩️ Lista para reembolso",
  [OrderStatus.DISPUTE]: "⚖️ En disputa",
  [OrderStatus.COMPLETED]: "✅ Completada",
  [OrderStatus.REFUNDED]: "↩️ Reembolsada",
  [OrderStatus.CANCELLED]: "❌ Cancelada",
};

export const OrderStatusLabelsEN: Record<string, string> = {
  [OrderStatus.PENDING]: "⏳ Pending",
  [OrderStatus.WAITING_TAKER_CONFIRMATION]: "⏳ Waiting for confirmation",
  [OrderStatus.WAITING_MAKER_CONFIRMATION]: "⏳ Waiting for confirmation",
  [OrderStatus.WAITING_ESCROW]: "📥 Waiting for deposit",
  [OrderStatus.UNCONFIRMED]: "🔄 Confirming on network",
  [OrderStatus.ACTIVE]: "🟢 Active",
  [OrderStatus.CANCEL_REQUESTED]: "⚠️ Cancellation requested",
  [OrderStatus.FIAT_SENT]: "💸 Fiat sent",
  [OrderStatus.RELEASABLE]: "🔓 Ready to release",
  [OrderStatus.REFUNDABLE]: "↩️ Ready to refund",
  [OrderStatus.DISPUTE]: "⚖️ In dispute",
  [OrderStatus.COMPLETED]: "✅ Completed",
  [OrderStatus.REFUNDED]: "↩️ Refunded",
  [OrderStatus.CANCELLED]: "❌ Cancelled",
};

export interface FiatCodeDetail {
  min: number;
  emoji: string;
}

export const FiatEmojis: Record<string, string> = {
  USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", CAD: "🇨🇦", CHF: "🇨🇭",
  ARS: "🇦🇷", VES: "🇻🇪", COP: "🇨🇴", MXN: "🇲🇽", PEN: "🇵🇪",
  CLP: "🇨🇱", BRL: "🇧🇷", BOB: "🇧🇴", PYG: "🇵🇾", UYU: "🇺🇾",
  CRC: "🇨🇷", GTQ: "🇬🇹", DOP: "🇩🇴", PAB: "🇵🇦", HNL: "🇭🇳",
  JPY: "🇯🇵", CNY: "🇨🇳", RUB: "🇷🇺", INR: "🇮🇳", AUD: "🇦🇺",
};

export const getFiatEmoji = (c: string) => FiatEmojis[c.toUpperCase()] || "💵";