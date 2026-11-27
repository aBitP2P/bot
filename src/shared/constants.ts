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
  ExternallyCompleted: "EXTERNALLY_COMPLETED",
  ExternallyRefunded: "EXTERNALLY_REFUNDED",
  Dispute: "DISPUTE",
  Completed: "COMPLETED",
  Refunded: "REFUNDED",
  Cancelled: "CANCELLED",
} as const;

export const SettlementMethodType = {
  OnChain: "ON_CHAIN",
  Lightning: "LIGHTNING"
}

/** Etiqueta visual por red. Es igual en todos los idiomas. */
export const SettlementMethodLabel: Record<string, string> = {
  [SettlementMethodType.OnChain]: "⛓️ On-Chain",
  [SettlementMethodType.Lightning]: "⚡ Lightning",
};

export const getSettlementMethodLabel = (method?: string | null) =>
  (method && SettlementMethodLabel[method]) || "";

export const TERMINAL_STATUSES = [
  OrderStatus.Releasable,
  OrderStatus.Refundable,
  OrderStatus.Completed,
  OrderStatus.Cancelled,
  OrderStatus.Refunded,
  OrderStatus.Dispute,
  OrderStatus.ExternallyCompleted,
  OrderStatus.ExternallyRefunded
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
  [OrderStatus.ExternallyCompleted]: "✍️ Completado Externamente",
  [OrderStatus.ExternallyRefunded]: "✍️ Reembolsado Externamente",
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
  [OrderStatus.ExternallyCompleted]: "✍️ Externally Completed",
  [OrderStatus.ExternallyRefunded]: "✍️ Externally Refunded",
  [OrderStatus.Releasable]: "🔓 Ready to release",
  [OrderStatus.Refundable]: "↩️ Ready to refund",
  [OrderStatus.Dispute]: "⚖️ In dispute",
  [OrderStatus.Completed]: "✅ Completed",
  [OrderStatus.Refunded]: "↩️ Refunded",
  [OrderStatus.Cancelled]: "❌ Cancelled",
};

export const OrderStatusLabelsPT: Record<string, string> = {
  [OrderStatus.Pending]: "⏳ Pendente",
  [OrderStatus.WaitingTakerConfirmation]: "⏳ Aguardando confirmação",
  [OrderStatus.WaitingMakerConfirmation]: "⏳ Aguardando confirmação",
  [OrderStatus.WaitingEscrow]: "📥 Aguardando depósito",
  [OrderStatus.Unconfirmed]: "🔄 Confirmando na rede",
  [OrderStatus.Active]: "🟢 Ativa",
  [OrderStatus.CancelRequested]: "⚠️ Cancelamento solicitado",
  [OrderStatus.FiatSent]: "💸 Fiat enviado",
  [OrderStatus.ExternallyCompleted]: "✍️ Concluída Externamente",
  [OrderStatus.ExternallyRefunded]: "✍️ Reembolsada Externamente",
  [OrderStatus.Releasable]: "🔓 Pronta para liberar",
  [OrderStatus.Refundable]: "↩️ Pronta para reembolso",
  [OrderStatus.Dispute]: "⚖️ Em disputa",
  [OrderStatus.Completed]: "✅ Concluída",
  [OrderStatus.Refunded]: "↩️ Reembolsada",
  [OrderStatus.Cancelled]: "❌ Cancelada",
};

const FiatEmojis: Record<string, string> = {
  USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", CAD: "🇨🇦", CHF: "🇨🇭",
  ARS: "🇦🇷", VES: "🇻🇪", COP: "🇨🇴", MXN: "🇲🇽", PEN: "🇵🇪",
  CLP: "🇨🇱", BRL: "🇧🇷", BOB: "🇧🇴", PYG: "🇵🇾", UYU: "🇺🇾",
  CRC: "🇨🇷", GTQ: "🇬🇹", DOP: "🇩🇴", PAB: "🇵🇦", HNL: "🇭🇳",
  JPY: "🇯🇵", CNY: "🇨🇳", RUB: "🇷🇺", INR: "🇮🇳", AUD: "🇦🇺",
};

export const getFiatEmoji = (c: string) => FiatEmojis[c.toUpperCase()] || "💵";
export const REQUIRED_CONFIRMATIONS =
  Number(process.env.REQUIRED_CONFIRMATIONS) || 2;

export const formatConfirmations = (lang: "es" | "en" | "pt") => {
  const n = REQUIRED_CONFIRMATIONS;
  const words = {
    es: n === 1 ? "confirmación" : "confirmaciones",
    en: n === 1 ? "confirmation" : "confirmations",
    pt: n === 1 ? "confirmação" : "confirmações",
  };
  return `${n} ${words[lang]}`;
};