import { Markup } from "telegraf";

function chunkArray<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  );
}

export function buildCancelOrderKeyboard(userOrders: any[]) {
  const buttons = userOrders.map((o) =>
    Markup.button.callback(
      `${o.id.slice(0, 2)}..${o.id.slice(-2)} - ${o.type} - ${o.fiatCode}`,
      `cancelCommand_${o.id}`,
    ),
  );
  return Markup.inlineKeyboard(chunkArray(buttons, 3));
}

export function buildMarginKeyboard(marketPriceLabel: string) {
  return Markup.inlineKeyboard([
    [-5, -4, -3, -2, -1].map((m) =>
      Markup.button.callback(`${m}%`, `margin_${m}`),
    ),
    [Markup.button.callback(marketPriceLabel, "margin_0")],
    [1, 2, 3, 4, 5].map((m) => Markup.button.callback(`+${m}%`, `margin_${m}`)),
  ]);
}

export function buildTakeOrderKeyboard(buttonText: string, orderId: string) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(buttonText, `take_order_${orderId}`)],
  ]);
}

export function buildTakerConfirmKeyboard(
  btnYes: string,
  btnNo: string,
  orderId: string,
) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(btnYes, `taker_yes_${orderId}`)],
    [Markup.button.callback(btnNo, `taker_cancel_order_${orderId}`)],
  ]);
}

export function buildMakerConfirmKeyboard(
  btnYes: string,
  btnNo: string,
  orderId: string,
) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(btnYes, `maker_yes_${orderId}`)],
    [Markup.button.callback(btnNo, `maker_deny_${orderId}`)],
  ]);
}

export function buildSettleDisputeKeyboard(
  btnBuyer: string,
  btnSeller: string,
  btnRefund: string,
  orderId: string,
) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(btnBuyer, `settle_buyer_${orderId}`)],
    [Markup.button.callback(btnSeller, `settle_seller_${orderId}`)],
    [Markup.button.callback(btnRefund, `settle_refund_${orderId}`)],
  ]);
}
