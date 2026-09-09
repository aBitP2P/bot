import { Context, type NarrowedContext } from 'telegraf';
import type { CallbackQuery, Message, Update } from 'telegraf/types';
import type { orders, users } from './db/schema.js';
import type { dictionaries } from './locales/index.js';

export type OrderType = 'BUY' | 'SELL';

export type WizardStep = 
  | 'IDLE' 
  | 'SET_PASS'
  | 'CLAIM_PASSWORD'
  | 'CLAIM_REFUND_ADDRESS'
  | 'CLAIM_REFUND_CONFIRM'
  | 'WAITING_FIAT' 
  | 'WAITING_AMOUNT' 
  | 'WAITING_MARGIN' 
  | 'WAITING_PAYMENT_METHOD';

export interface OrderDraft {
  type?: OrderType;
  fiat?: string;
  amount?: string;
  margin?: number;
  paymentMethod?: string;
  refundAddress?: string;
}

export type UserRecord = typeof users.$inferSelect;
export type OrderRecord = typeof orders.$inferSelect;
export type Dictionary = typeof dictionaries['es'];

export interface SessionData {
  step: WizardStep;
  draft: OrderDraft;
  previewMessageId?: number | undefined; 
  awaitingAddressForOrder?: string | undefined;
  awaitingAmountForOrder?: string | undefined;
  claimOrderId?: string | undefined;
}

export interface BotContext extends Context {
  session: SessionData;
  user: UserRecord;
  dict: Dictionary;
}

export type CommandContext = NarrowedContext<
  BotContext,
  Update.MessageUpdate<Message.TextMessage>
>;

export type CallbackContext = NarrowedContext<
  BotContext,
  Update.CallbackQueryUpdate<CallbackQuery>
>;