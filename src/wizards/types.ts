export type OrderType = "BUY" | "SELL";
export type LoanType = "LEND" | "BORROW";

export type WizardStep =
  | "IDLE"
  | "SET_PASS"
  | "CLAIM_PASSWORD"
  | "AWAITING_CLAIM_ADDRESS"
  | "CLAIM_REFUND_CONFIRM"
  | "WAITING_FIAT"
  | "WAITING_AMOUNT"
  | "WAITING_MARGIN"
  | "WAITING_PAYMENT_METHOD"
  | "WAITING_LOAN_FIAT"
  | "WAITING_LOAN_AMOUNT"
  | "WAITING_LOAN_APR"
  | "WAITING_LOAN_LTV"
  | "WAITING_LOAN_DURATION"
  | "WAITING_LOAN_PAYMENT_METHOD";;

export interface OrderDraft {
  type?: OrderType;
  fiat?: string;
  amount?: string;
  margin?: number;
  paymentMethod?: string;
  refundAddress?: string;
}

export interface LoanDraft {
  type?: LoanType;
  fiat?: string;
  amount?: string;
  apr?: number;
  ltv?: number;
  durationMonths?: string;
  paymentMethod?: string;
}
