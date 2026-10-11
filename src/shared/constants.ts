export const Strings = {
  OrderChannelTag: "@aBitP2PExchange",
  GeneralChatTag: "@aBitP2PGeneral\\_es",
};

export const LTV_LIQUIDATION_THRESHOLD = 90;

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

export const LoanStatus = {
  Pending: "LOAN_PENDING", 
  WaitingTakerConfirmation: "LOAN_WAITING_TAKER_CONFIRMATION",
  WaitingMakerConfirmation: "LOAN_WAITING_MAKER_CONFIRMATION",
  CancelRequested: "LOAN_CANCEL_REQUESTED",

  WaitingCollateral: "LOAN_WAITING_COLLATERAL", 
  CollateralUnconfirmed: "LOAN_COLLATERAL_UNCONFIRMED", 

  WaitingDisbursement: "LOAN_WAITING_DISBURSEMENT", 
  DisbursementSent: "LOAN_DISBURSEMENT_SENT", 

  Active: "LOAN_ACTIVE", 

  Releasable: "LOAN_RELEASABLE", 
  Refundable: "LOAN_REFUNDABLE", 
  Liquidatable: "LOAN_LIQUIDATABLE", 
  PartiallyLiquidated: "LOAN_PARTIALLY_LIQUIDATED",
  Expired: "LOAN_EXPIRED",
  
  Completed: "LOAN_COMPLETED", 
  Liquidated: "LOAN_LIQUIDATED", 
  Refunded: "LOAN_REFUNDED", 
  Cancelled: "LOAN_CANCELLED", 
  Dispute: "LOAN_DISPUTE", 
} as const;

export const LoanPaymentStatus = {
  Pending: "PENDING",
  Confirmed: "CONFIRMED",
  Rejected: "REJECTED"
}

export const LoanTypes = {
  Lend: "LEND",
  Borrow: "BORROW"
};

export const TERMINAL_ORDER_STATUSES = [
  OrderStatus.Releasable,
  OrderStatus.Refundable,
  OrderStatus.Completed,
  OrderStatus.Cancelled,
  OrderStatus.Refunded,
  OrderStatus.Dispute,
];

export const TERMINAL_LOAN_STATUSES = [
  LoanStatus.Releasable,
  LoanStatus.Refundable,
  LoanStatus.Liquidatable,
  LoanStatus.Completed,
  LoanStatus.Liquidated,
  LoanStatus.Refunded,
  LoanStatus.Cancelled,
  LoanStatus.Dispute,
];

export type TOrderStatus = typeof OrderStatus[keyof typeof OrderStatus];
export type TLoanStatus = typeof LoanStatus[keyof typeof LoanStatus];
export type ContractStatus = TOrderStatus | TLoanStatus;

export const isTerminalStatus = (status: ContractStatus): boolean => {
  return [...TERMINAL_ORDER_STATUSES, ...TERMINAL_LOAN_STATUSES].includes(status as any);
};

const FiatEmojis: Record<string, string> = {
  USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", CAD: "🇨🇦", CHF: "🇨🇭",
  ARS: "🇦🇷", VES: "🇻🇪", COP: "🇨🇴", MXN: "🇲🇽", PEN: "🇵🇪",
  CLP: "🇨🇱", BRL: "🇧🇷", BOB: "🇧🇴", PYG: "🇵🇾", UYU: "🇺🇾",
  CRC: "🇨🇷", GTQ: "🇬🇹", DOP: "🇩🇴", PAB: "🇵🇦", HNL: "🇭🇳",
  JPY: "🇯🇵", CNY: "🇨🇳", RUB: "🇷🇺", INR: "🇮🇳", AUD: "🇦🇺",
};

export const getFiatEmoji = (c: string) => FiatEmojis[c.toUpperCase()] || "💵";