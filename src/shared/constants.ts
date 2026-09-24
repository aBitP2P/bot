export const Strings = {
  OrderChannelTag: "@aBitP2PExchange",
  GeneralChatTag: "@aBitP2PGeneral\\_es",
};

export const OrderStatus = {
  Pending: "PENDING",
  WaitingTakerConfirmation: "WAITING_TAKER_CONFIRMATION",
  WaitingMakerConfirmation: "WAITING_MAKER_CONFIRMATION",
  WaitingEscrow: "WAITING_ESCROW",
  Unconfirmed: "UNCONFIRMED",
  Active: "ACTIVE",
  CancelRequested: "CANCEL_REQUESTED",
  FiatSent: "FIAT_SENT",
  Releasable: "RELEASABLE",
  Refundable: "REFUNDABLE",
  Dispute: "DISPUTE",
  Completed: "COMPLETED",
  Refunded: "REFUNDED",
  Cancelled: "CANCELLED",
} as const;

export const TERMINAL_STATUSES = [
  OrderStatus.Releasable,
  OrderStatus.Refundable,
  OrderStatus.Completed,
  OrderStatus.Cancelled,
  OrderStatus.Refunded,
  OrderStatus.Dispute,
];

export const OrderStatusLabelsES: Record<string, string> = {
  [OrderStatus.Pending]: "⏳ Pendiente",
  [OrderStatus.WaitingTakerConfirmation]: "⏳ Esperando confirmación",
  [OrderStatus.WaitingMakerConfirmation]: "⏳ Esperando confirmación",
  [OrderStatus.WaitingEscrow]: "📥 Esperando depósito",
  [OrderStatus.Unconfirmed]: "🔄 Confirmando en la red",
  [OrderStatus.Active]: "🟢 Activa",
  [OrderStatus.CancelRequested]: "⚠️ Cancelación solicitada",
  [OrderStatus.FiatSent]: "💸 Fiat enviado",
  [OrderStatus.Releasable]: "🔓 Lista para liberar",
  [OrderStatus.Refundable]: "↩️ Lista para reembolso",
  [OrderStatus.Dispute]: "⚖️ En disputa",
  [OrderStatus.Completed]: "✅ Completada",
  [OrderStatus.Refunded]: "↩️ Reembolsada",
  [OrderStatus.Cancelled]: "❌ Cancelada",
};

export const OrderStatusLabelsEN: Record<string, string> = {
  [OrderStatus.Pending]: "⏳ Pending",
  [OrderStatus.WaitingTakerConfirmation]: "⏳ Waiting for confirmation",
  [OrderStatus.WaitingMakerConfirmation]: "⏳ Waiting for confirmation",
  [OrderStatus.WaitingEscrow]: "📥 Waiting for deposit",
  [OrderStatus.Unconfirmed]: "🔄 Confirming on network",
  [OrderStatus.Active]: "🟢 Active",
  [OrderStatus.CancelRequested]: "⚠️ Cancellation requested",
  [OrderStatus.FiatSent]: "💸 Fiat sent",
  [OrderStatus.Releasable]: "🔓 Ready to release",
  [OrderStatus.Refundable]: "↩️ Ready to refund",
  [OrderStatus.Dispute]: "⚖️ In dispute",
  [OrderStatus.Completed]: "✅ Completed",
  [OrderStatus.Refunded]: "↩️ Refunded",
  [OrderStatus.Cancelled]: "❌ Cancelled",
};

const FiatEmojis: Record<string, string> = {
  USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", CAD: "🇨🇦", CHF: "🇨🇭",
  ARS: "🇦🇷", VES: "🇻🇪", COP: "🇨🇴", MXN: "🇲🇽", PEN: "🇵🇪",
  CLP: "🇨🇱", BRL: "🇧🇷", BOB: "🇧🇴", PYG: "🇵🇾", UYU: "🇺🇾",
  CRC: "🇨🇷", GTQ: "🇬🇹", DOP: "🇩🇴", PAB: "🇵🇦", HNL: "🇭🇳",
  JPY: "🇯🇵", CNY: "🇨🇳", RUB: "🇷🇺", INR: "🇮🇳", AUD: "🇦🇺",
};

export const getFiatEmoji = (c: string) => FiatEmojis[c.toUpperCase()] || "💵";