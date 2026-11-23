import type { Telegram } from "telegraf";
import { setChannelMessageId } from "../db/orders.js";
import { getUserDict } from "../locales/index.js";
import { buildTakeOrderKeyboard } from "../shared/keyboards.js";
import type { OrderRecord, UserRecord } from "../types.js";
import { escapeMarkdown } from "../utils/format.js";

const PUBLIC_CHANNEL_ID = process.env.PUBLIC_CHANNEL_ID!;

export type PublishableOrder = Pick<
  OrderRecord,
  "id" | "type" | "fiatCode" | "amountFiat" | "paymentMethod" | "margin"
>;

/**
 * Publica una orden en el canal público en el idioma del creador y guarda el
 * message_id para poder borrarla o editarla después.
 */
export async function publishOrderToChannel(
  telegram: Telegram,
  order: PublishableOrder,
  creator: UserRecord,
): Promise<number> {
  const dict = getUserDict(creator.language);
  const isSell = order.type === "SELL";

  const sentMsg = await telegram.sendMessage(
    PUBLIC_CHANNEL_ID,
    dict.channelOrder({
      action: isSell ? dict.actionSell : dict.actionBuy,
      amountFiat: order.amountFiat,
      fiat: order.fiatCode,
      payDirection: isSell ? dict.payDirectionSell : dict.payDirectionBuy,
      method: escapeMarkdown(order.paymentMethod),
      daysUsing: Math.floor((Date.now() - creator.createdAt) / 86400000),
      hashtag: `#${order.type}${order.fiatCode}`,
      margin: order.margin,
      rating: creator.rating || 0,
      ratingCount: creator.ratingCount,
      tradesCount: creator.tradesCount || 0,
      id: order.id,
    }),
    {
      parse_mode: "Markdown",
      ...buildTakeOrderKeyboard(
        isSell ? dict.btnBuyBitcoin : dict.btnSellBitcoin,
        order.id,
      ),
    },
  );

  await setChannelMessageId(order.id, sentMsg.message_id);

  return sentMsg.message_id;
}

/** Borra la publicación de una orden del canal. Ignora el error si ya no existe. */
export async function removeOrderFromChannel(
  telegram: Telegram,
  channelMessageId: number | null | undefined,
) {
  if (!channelMessageId) return;
  await telegram
    .deleteMessage(PUBLIC_CHANNEL_ID, channelMessageId)
    .catch((e) => console.error(e));
}
