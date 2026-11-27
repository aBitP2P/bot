import { getClaimableOrders, getOrder } from "../db/orders.js";
import { buildOrderSelectKeyboard } from "../shared/keyboards.js";
import { OrderStatus, SettlementMethodType } from "../shared/constants.js";
import type { CallbackContext, CommandContext } from "../types.js";
import { getParties } from "../utils/order.js";
import { safeDeleteMsg } from "../utils/telegram.js";
import { getBuyerNetSats } from "../config/fees.js";

export async function setAddressCommand(ctx: CommandContext) {
  const userId = ctx.from.id;
  const dict = ctx.dict;

  const args = ctx.message.text.split(" ");
  if (args.length < 2) {
    const claimableOrders = (await getClaimableOrders(userId)).filter(
      (o) => o.status === OrderStatus.Releasable,
    );

    if (claimableOrders.length === 0)
      await ctx.reply(dict.noClaimableOrdersFound, { parse_mode: "Markdown" });
    else
      await ctx.reply(dict.selectAddressChangeableOrder, {
        ...buildOrderSelectKeyboard(claimableOrders, "setAddressCommand"),
      });
    return;
  }

  const orderId = args[1] as string;
  return await handleAddressChange(ctx, orderId);
}

/**
 * Pide al comprador una nueva factura/dirección de cobro para una orden
 * RELEASABLE (p. ej. la factura original expiró y /claim falló con
 * `invoice-expired`). El texto resultante se valida en el textHandler, que
 * guarda el destino con setPayoutInvoice/setBuyerAddress.
 */
export async function handleAddressChange(
  ctx: CommandContext | CallbackContext,
  orderId: string,
) {
  await safeDeleteMsg(ctx);

  const dict = ctx.dict;
  const order = await getOrder(orderId);
  if (!order) return ctx.reply(dict.orderNotFound);

  if (order.status !== OrderStatus.Releasable)
    return ctx.reply(dict.invalidOrderStatus);

  const { buyerId } = getParties(order);
  if (ctx.from.id !== buyerId) return ctx.reply(dict.onlyBuyer);

  const expectedSats = getBuyerNetSats(order.amountSats);
  ctx.session.awaitingAddressForOrder = orderId;

  return ctx.reply(
    order.settlementMethod === SettlementMethodType.Lightning
      ? dict.askBuyerInvoice(expectedSats)
      : dict.askBuyerAddress(expectedSats),
    { parse_mode: "Markdown" },
  );
}
