export type OrderType = "BUY" | "SELL";

export type WizardStep =
  | "IDLE"
  | "SET_PASS"
  | "CLAIM_PASSWORD"
  | "CLAIM_REFUND_ADDRESS"
  | "CLAIM_REFUND_CONFIRM"
  | "WAITING_FIAT"
  | "WAITING_AMOUNT"
  | "WAITING_MARGIN"
  | "WAITING_PAYMENT_METHOD";

export interface OrderDraft {
  type?: OrderType;
  fiat?: string;
  amount?: string;
  margin?: number;
  paymentMethod?: string;
  refundAddress?: string;
}
