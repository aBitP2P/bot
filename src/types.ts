import { Context, type NarrowedContext } from 'telegraf';
import type { CallbackQuery, Message, Update } from 'telegraf/types';
import type { loans, orders, users } from './db/schema.js';
import type { dictionaries } from './locales/index.js';
import type { WizardStep, OrderDraft, LoanDraft } from './wizards/types.js';

export type UserRecord = typeof users.$inferSelect;
export type LoanRecord = typeof loans.$inferInsert;
export type OrderRecord = typeof orders.$inferSelect;
export type Dictionary = typeof dictionaries['es'];

export interface SessionData {
  step: WizardStep;
  draft: OrderDraft;
  loanDraft?: LoanDraft;
  previewMessageId?: number | undefined; 
  awaitingAddressForOrder?: string | undefined;
  awaitingAmountForOrder?: string | undefined;
  passwordToConfirm?: string | undefined;
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