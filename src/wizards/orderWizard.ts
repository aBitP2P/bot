import { Markup } from 'telegraf';
import { type BotContext, type OrderType, type WizardStep } from '../types.js';
import { t, type Language, dictionaries } from '../locales/index.js';
import { db } from '../db/index.js';
import { orders } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import crypto from "node:crypto"
import { getUser } from '../db/users.js';
import { createOrder } from '../db/orders.js';
import fiatCodes from '../utils/allowedFiatCodes.js';

const CHANNEL_ID = process.env.PUBLIC_CHANNEL_ID!;


function getPromptForStep(step: WizardStep, lang: Language): string {
  const dict = dictionaries[lang];
  switch (step) {
    case 'WAITING_FIAT': return dict.promptFiat;
    case 'WAITING_AMOUNT': return dict.promptAmount;
    case 'WAITING_MARGIN': return dict.promptMargin;
    case 'WAITING_PAYMENT_METHOD': return dict.promptPaymentMethod;
    default: return '';
  }
}

function getWizardPreviewText(draft: any, step: WizardStep, lang: Language, customPrompt?: string): string {
  const dict = dictionaries[lang];

  const typeText = draft.type === 'BUY' ? dict.buyType : dict.sellType;
  const fiatText = draft.fiat || ' ';
  const amountText = draft.amount || ' ';

  let marginText = ' ';
  if (draft.margin !== undefined) {
    marginText = draft.margin > 0 ? `+${draft.margin}%` : `${draft.margin}%`;
  }

  const methodText = draft.paymentMethod || ' ';
  const promptText = customPrompt ?? getPromptForStep(step, lang);

  return dict.wizardPreview(typeText, fiatText, amountText, marginText, methodText, promptText);
}

export async function startOrderWizard(ctx: BotContext, type: OrderType) {
  const userId = ctx.from?.id;
  if (!userId) return;
  if (!ctx.user.encryptedWif) return ctx.reply(ctx.dict.setYourPersonalPassword);
  const lang = ctx.user.language as Language;

  ctx.session = {
    step: 'WAITING_FIAT',
    draft: { type }
  };

  const text = getWizardPreviewText(ctx.session.draft, ctx.session.step, lang);
  const sentMessage = await ctx.reply(text, { parse_mode: 'Markdown' });
  ctx.session.previewMessageId = sentMessage.message_id;
}

export async function cancelWizard(ctx: BotContext) {
  const userId = ctx.from?.id;
  if (!userId) return;

  ctx.session = { step: 'IDLE', draft: {} };
  await ctx.reply(ctx.dict.cancelled);
}

export async function handleWizardInput(ctx: BotContext): Promise<boolean> {
  const step = ctx.session.step;
  if (!step || step === 'IDLE') return false;

  const userId = ctx.from?.id;
  if (!userId) return false;
  const lang = ctx.user.language as Language;

  const message = ctx.message;
  const text = message && 'text' in message ? message.text.trim() : '';

  if (message) {
    try { await ctx.deleteMessage(message.message_id); } catch (e) { }
  }

  const chatId = ctx.chat?.id;
  const previewId = ctx.session.previewMessageId;

  async function updatePreview(newStep: WizardStep, markup?: any, errorMessage?: string) {
    if (chatId && previewId) {
      try {
        await ctx.telegram.editMessageText(
          chatId, previewId, undefined,
          getWizardPreviewText(ctx.session.draft, newStep, lang, errorMessage),
          { parse_mode: 'Markdown', reply_markup: markup }
        );
      } catch (e) { }
    }
  }

  switch (step) {
    case 'WAITING_FIAT':
      const f = text.toUpperCase();
      if (!f || !(f in fiatCodes)) return true;
      ctx.session.draft.fiat = f.toUpperCase();
      ctx.session.step = 'WAITING_AMOUNT';
      await updatePreview('WAITING_AMOUNT');
      return true;

    case 'WAITING_AMOUNT':
      if (!text || !/^(\d+([.,]\d{1,2})?)(-(\d+([.,]\d{1,2})?))?$/.test(text)) return true;
      const [min, max] = text.split('-').map(Number) as [number, number];
      if (max !== undefined && min >= max) return true;
      const minFiatValue = fiatCodes[ctx.session.draft.fiat!]!.min;
      if (min < minFiatValue) {
        await updatePreview('WAITING_AMOUNT', undefined, ctx.dict.fiatValueBelowMinimun(ctx.session.draft.fiat!, minFiatValue));
        return true;
      }

      ctx.session.draft.amount = text;
      ctx.session.step = 'WAITING_MARGIN';

      const marginKeyboard = [
        [-5, -4, -3, -2, -1].map(m => Markup.button.callback(`${m}%`, `margin_${m}`)),
        [Markup.button.callback(ctx.dict.marketPrice, 'margin_0')],
        [1, 2, 3, 4, 5].map(m => Markup.button.callback(`+${m}%`, `margin_${m}`))
      ];

      await updatePreview('WAITING_MARGIN', { inline_keyboard: marginKeyboard });
      return true;

    case 'WAITING_PAYMENT_METHOD':
      if (!text || text.trim().length === 0) return true;
      const sanitized = text.replace(/[&/\\#,+~%.'":*?<>{}]/g, '');
      if (sanitized.trim().length === 0) return true;

      ctx.session.draft.paymentMethod = sanitized;

      await publishOrderToChannel(ctx, lang);
      ctx.session = { step: 'IDLE', draft: {} };
      return true;

    default:
      return false;
  }
}

export async function handleWizardAction(ctx: BotContext) {
  const callbackQuery = ctx.callbackQuery as { data?: string };
  if (!callbackQuery?.data?.startsWith('margin_')) return;

  const userId = ctx.from?.id;
  if (!userId) return;
  const lang = ctx.user.language as Language;

  ctx.session.draft.margin = parseInt(callbackQuery.data.replace('margin_', ''), 10);
  ctx.session.step = 'WAITING_PAYMENT_METHOD';

  await ctx.answerCbQuery();

  const chatId = ctx.chat?.id;
  const previewId = ctx.session.previewMessageId;

  if (chatId && previewId) {
    try {
      const currentText = getWizardPreviewText(ctx.session.draft, ctx.session.step, lang);

      await ctx.telegram.editMessageText(chatId, previewId, undefined, currentText, {
        parse_mode: 'Markdown'
      });
    } catch (e) { }
  }
}

async function publishOrderToChannel(ctx: BotContext, lang: Language) {
  const dict = dictionaries[lang];
  const { margin, type, fiat, amount, paymentMethod } = ctx.session.draft;
  const userId = ctx.from?.id;

  if (!userId) return;

  const user = await getUser(userId);

  const daysUsing = user ? Math.floor((Date.now() - user.createdAt) / 86400000) : 0;
  const tradesCount = user?.tradesCount || 0;

  const action = type === 'SELL' ? dict.actionSell : dict.actionBuy;
  const payDirection = type === 'SELL' ? dict.payDirectionSell : dict.payDirectionBuy;
  const hashtag = `#${type}${fiat}`;

  const rawHex = crypto.randomBytes(6).toString('hex').slice(0, 12);
  const orderId = rawHex.match(/.{1,6}/g)!.join('-');

  await createOrder({
    id: orderId,
    type: type!,
    creatorId: userId,
    amountFiat: amount!,
    fiatCode: fiat!,
    paymentMethod: paymentMethod!,
    margin: margin!
  });

  const orderMessage = dict.channelOrder({
    action,
    amountFiat: amount!,
    fiat: fiat!,
    payDirection,
    method: paymentMethod!,
    daysUsing,
    hashtag,
    margin: margin!,
    rating: user?.rating || 0,
    tradesCount: tradesCount,
    id: orderId
  });

  const buttonText = type === 'SELL' ? t(lang, 'btnBuyBitcoin') : t(lang, 'btnSellBitcoin');

  const sentChannelMsg = await ctx.telegram.sendMessage(CHANNEL_ID, orderMessage, {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard([
      [Markup.button.callback(buttonText, `take_order_${orderId}`)]
    ])
  });

  await db.update(orders).set({ channelMessageId: sentChannelMsg.message_id }).where(eq(orders.id, orderId));

  const chatId = ctx.chat?.id;
  const previewId = ctx.session.previewMessageId;
  if (chatId && previewId) {
    try {
      await ctx.telegram.editMessageText(chatId, previewId, undefined, dict.orderPublishedSuccess(orderId), { parse_mode: 'Markdown' });
    } catch (e) { }
  }

}