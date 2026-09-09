import { ensureUser } from '../db/users.js';
import { dictionaries, type Language } from '../locales/index.js';
import { type BotContext } from '../types.js';

export const userMiddleware = async (ctx: BotContext, next: () => Promise<void>) => {
  if (!ctx.from) return next();

  if (ctx.chat && ctx.chat.type === 'private' && !ctx.from.username) {
    await ctx.reply(
      dictionaries["es"].telegramUsernameRequired,
      { parse_mode: 'Markdown' }
    );
    return; 
  }

  const userId = ctx.from.id;
  
  const userRecord = await ensureUser(userId, ctx.from.username!);

  if (userRecord) {
    ctx.user = userRecord;
    ctx.dict = dictionaries[userRecord.language as Language] || dictionaries['es'];
  }

  return next();
};