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

export const FiatCodes: Record<string, FiatCodeDetail> = {
  USD: { min: 50, emoji: "🇺🇸" },
  EUR: { min: 45, emoji: "🇪🇺" },
  GBP: { min: 35, emoji: "🇬🇧" },
  CAD: { min: 70, emoji: "🇨🇦" },
  AUD: { min: 70, emoji: "🇦🇺" },
  CHF: { min: 40, emoji: "🇨🇭" },
  JPY: { min: 7500, emoji: "🇯🇵" },
  BRL: { min: 250, emoji: "🇧🇷" },
  CLP: { min: 45000, emoji: "🇨🇱" },
  COP: { min: 150000, emoji: "🇨🇴" },
  MXN: { min: 850, emoji: "🇲🇽" },
  PEN: { min: 160, emoji: "🇵🇪" },
  ARS: { min: 80000, emoji: "🇦🇷" },
  VES: { min: 45000, emoji: "🇻🇪" },
};

export type SupportedFiat = keyof typeof FiatCodes;
