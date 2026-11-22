import { buildOutputDescriptor } from "../core/bitcoin/wallet.js";
import { getOrder, getUserOrders } from "../db/orders.js";
import { getUser } from "../db/users.js";
import { buildOrderSelectKeyboard } from "../shared/keyboards.js";
import type { CallbackContext, CommandContext } from "../types.js";
import { getParties } from "../utils/order.js";

export async function backupCommand(ctx: CommandContext) {
  const userId = ctx.from.id;
  const dict = ctx.dict;

  let userOrders = await getUserOrders(userId, { forBackup: true });
  if (userOrders.length === 0) return ctx.reply(dict.noBackupOrdersFound);
  await ctx.reply(dict.selectOrderForBackup, {
    ...buildOrderSelectKeyboard(userOrders, "backupCommand"),
  });
  return;
}

export async function handleOrderBackup(ctx: CallbackContext, orderId: string) {
  const order = await getOrder(orderId);
  if (!order) return ctx.reply(ctx.dict.orderNotFound);
  if (!order.escrowAddress) return ctx.reply(ctx.dict.invalidOrderStatus);
  const { buyerId, sellerId } = getParties(order);
  if (![buyerId, sellerId].includes(ctx.user.telegramId)) return;

  const buyer = await getUser(buyerId!);
  const seller = await getUser(sellerId!);

  return ctx.reply(
    ctx.dict.orderBackup({
      orderId: order.id,
      escrowAddress: order.escrowAddress,
      descriptor: buildOutputDescriptor({
        buyerXpub: order.buyerXpub!,
        buyerFingerprint: buyer!.fingerprint!,
        sellerXpub: order.sellerXpub!,
        sellerFingerprint: seller!.fingerprint!,
      }),
      escrowIndex: order.escrowIndex!,
      userXpub: ctx.user.xpub ?? "—",
      userFingerprint: ctx.user.fingerprint ?? "—",
    }),
    { parse_mode: "Markdown" },
  );
}
