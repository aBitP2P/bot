import { getOrder, tryTransitionOrderStatus } from "../db/orders.js";
import { getUser } from "../db/users.js";
import { dictionaries, type Language } from "../locales/index.js";
import type { CommandContext } from "../types.js";


export async function fiatsentCommand(ctx: CommandContext) {
  const userId = ctx.from.id;
  const userRecord = await getUser(userId);
  const dict = dictionaries[(userRecord!.language as Language) || 'es'];

  const args = ctx.message.text.split(' ');
  if (args.length < 2) return ctx.reply(dict.commandUsage('/fiatsent <ORDER_ID>'), { parse_mode: 'Markdown' });

  const orderId = args[1] as string;
  const order = await getOrder(orderId);

  if (!order) return ctx.reply(dict.orderNotFound);
  if (order.status !== 'ACTIVE') return ctx.reply(dict.invalidOrderStatus);

  const isCreatorSelling = order.type === 'SELL';
  const buyerId = isCreatorSelling ? order.takerId : order.creatorId;
  const sellerId = isCreatorSelling ? order.creatorId : order.takerId;

  if (userId !== buyerId) return ctx.reply(dict.onlyBuyer);

  const didMark = await tryTransitionOrderStatus(orderId, ['ACTIVE'], 'FIAT_SENT');
  if (!didMark) return ctx.reply(dict.invalidOrderStatus);

  const seller = await getUser(sellerId!);
  const dictSeller = dictionaries[(seller?.language as Language) || 'es'];
  const buyerName = ctx.from.username || "El comprador";

  await ctx.reply(dict.fiatSentToBuyer(order.id), { parse_mode: 'Markdown' });
  await ctx.telegram.sendMessage(sellerId!, dictSeller.fiatSentToSeller(order.id, buyerName), { parse_mode: 'Markdown' });
}