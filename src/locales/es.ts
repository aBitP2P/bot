import type { orders } from "../db/schema.js";
import {
  Strings,
  OrderStatusLabelsES,
  getFiatEmoji,
  formatConfirmations,
} from "../shared/constants.js";
import { mempoolBaseURL, type MempoolFeesData } from "../core/bitcoin/index.js";
type OrderRow = typeof orders.$inferSelect;

export default {
  // ─────────────────────────── General & UI ───────────────────────────
  helpMessage: () =>
    `🤖 *aBitP2P — Centro de Ayuda*\n\n` +
    `🛒 *Mercado*\n` +
    `/buy — Comprar Bitcoin\n` +
    `/sell — Vender Bitcoin\n` +
    `/listorders — Ver tus órdenes activas\n\n` +
    `⚡️ *Gestión de Órdenes* (Añade el ID)\n` +
    `/fiatsent — Notificar pago enviado\n` +
    `/release — Liberar fondos al comprador\n` +
    `/claim — Reclamar fondos o reembolso\n` +
    `/setaddress — Actualizar factura Lightning de cobro\n` +
    `/cancel — Cancelar una orden\n` +
    `/dispute — Abrir disputa con moderación\n` +
    `_Ej: /release ab12cd-34ef56_\n\n` +
    `⚙️ *Cuenta y Sistema*\n` +
    `/setpass — Encripta tu perfil a partir de una contraseña\n` +
    `/setlang — Cambia de idioma\n` +
    "/fees - Revisa como están las comisiones para tus órdenes \n" +
    "/setfee - Establece la comisión de red que se usará\n" +
    `/backup — Respalda el descriptor de tus escrows\n` +
    `/exit — Cancelar la acción actual\n\n` +
    `📢 Canal: ${Strings.OrderChannelTag}\n` +
    `💬 Grupo: ${Strings.GeneralChatTag}`,
  commandUsage: (usage: string, example?: string) =>
    `⚠️ *Uso:* \`${usage}\` ${example ? `💡 \`${example}\`` : ""}`,
  cancelled: "❌ Proceso cancelado.",
  btnYes: "✅ Sí, continuar",
  btnNo: "❌ No, cancelar",
  btnBuyBitcoin: "Comprar Bitcoin",
  btnSellBitcoin: "Vender Bitcoin",
  actionBuy: "🟢 Comprando",
  actionSell: "🔴 Vendiendo",
  buyType: "🟢 Compra",
  sellType: "🔴 Venta",
  payDirectionBuy: "Pago por",
  payDirectionSell: "Recibo pago por",
  marketPrice: "A precio de mercado",

  // ─────────────────────────── Config & Profile ───────────────────────────
  telegramUsernameRequired:
    "❌ **Requiere nombre de usuario**\n\nNecesitas configurar un @username de Telegram para interactuar con este bot. Ve a *Ajustes > Nombre de usuario*, configúralo y vuelve a intentarlo.",
  setYourPersonalPassword:
    "❌ Primero debes de establecer tu contraseña con /setpass para poder tomar o crear órdenes.",
  onChainRequiresPassword:
    "🔐 *Necesitas crear una contraseña para usar órdenes On-chain.*\n\nSe canceló la creación de la orden. Configura tu contraseña con /setpass y vuelve a intentar crear la orden con /buy o /sell.\n\n_Las órdenes Lightning no requieren contraseña._",
  onChainTakeRequiresPassword:
    "🔐 *Necesitas crear una contraseña para tomar órdenes On-chain.*\n\nConfigura tu contraseña con /setpass y vuelve a intentar tomar la orden.\n\n_Las órdenes Lightning no requieren contraseña._",
  promptPassword:
    `*⚠️ Se generará unas 12 palabras ligadas a tu usuario, la contraseña SERÁ NECESARIA para reclamar las órdenes.*\n` +
    `*Asegúrate de que la contraseña sea segura* y guardala en un lugar seguro.\n\n` +
    "🔑 *Por favor, escribe tu contraseña para configurar tu usuario:*",
  unsafePassword:
    "⚠️ *Contraseña insegura.* Debe tener al menos *8 caracteres*. Por favor, envía una contraseña más fuerte:",
  confirmPassword: "👉 Para confirmar, vuelve a escribir la contraseña: ",
  passwordsDoNotMatch:
    "❌ Las contraseñas no coinciden. Inténtalo de nuevo con /setpass",
  passwordAlreadySet: "❌ Ya tienes una contraseña establecida previamente.",
  passwordSetSuccess: `✅ *Contraseña configurada con éxito.* Perfil encriptado y listo para usar.`,
  pleaseSaveMnemonic: (mnemonic: string) =>
    "A continuación se muestran tus 12 palabras 👇 ```\n" +
    mnemonic +
    "```" +
    "\n\n" +
    "⚠️ Borra este mensaje una vez hayas guardado tus 12 palabras de forma segura. *Ten en cuenta que solo servirá para firmar transacciones, NO deberías de guardar esta billetera para guardar fondos.*",
  invalidLanguage: "❌ Idioma inválido.",
  selectLanguage: "👇 Selecciona tu idioma preferido",
  languageUpdateSuccess: "✅ Idioma actualizado correctamente.",

  // ─────────────────────────── Market & Order Creation ───────────────────────────
  promptSelectSettlementMethod: "Selecciona la red que deseas usar",
  promptFiat: "¿Qué moneda FIAT deseas usar? (Ej: USD, EUR, VES)",
  promptAmount: "Indica el monto o rango (Ej: 500-1000 o 100)",
  promptMargin: "Selecciona el margen en los botones de abajo 👇",
  promptPaymentMethod: "Escribe el método de pago (Ej: Zelle, Transferencia)",
  invalidAmountAfterMargin: ({
    margin,
    satsAmount,
    minSats,
    minFiatRequired,
    fiatCode,
  }: {
    margin: number;
    satsAmount: number;
    minSats: number;
    minFiatRequired: string;
    fiatCode: string;
  }) =>
    `⚠️ *Monto insuficiente tras aplicar margen*\n\n` +
    `Al aplicar tu margen del ${margin}%, el total a recibir bajó a ${satsAmount.toLocaleString()} sats.\n\n` +
    `Para cumplir con el mínimo de ${minSats.toLocaleString()} sats, debes iniciar la orden con al menos *$${minFiatRequired} ${fiatCode}*.\n\n` +
    `🔄 Por favor, inicia la creación de la orden nuevamente.`,
  lightningAmountAboveMaximum: (
    fiatCode: string,
    maxFiat: number,
    maxSats: number,
  ) =>
    `❌ El monto máximo para órdenes Lightning es $${maxFiat.toLocaleString("de-DE")} ${fiatCode} (${maxSats.toLocaleString()} sats).\nIntenta de nuevo:`,
  lightningAmountAboveMaximumAfterMargin: ({
    margin,
    maxFiatRequired,
    maxSats,
    fiatCode,
  }: {
    margin: number;
    maxFiatRequired: string;
    maxSats: number;
    fiatCode: string;
  }) =>
    `⚠️ *Monto superior al máximo tras aplicar margen*\n\n` +
    `Al aplicar tu margen del ${margin}%, la orden supera el máximo de ${maxSats.toLocaleString()} sats permitido para Lightning.\n\n` +
    `El monto máximo permitido es *$${maxFiatRequired} ${fiatCode}*.\n\n` +
    `🔄 Por favor, inicia la creación de la orden nuevamente.`,
  wizardPreview: (
    chain: string,
    type: string,
    fiat: string,
    amount: string,
    margin: string,
    method: string,
    prompt: string,
  ) => {
    const lines = [`🔧 *Creando anuncio · ${type} BTC*`];
    if (chain) lines.push("Red: " + chain);
    if (fiat) lines.push(`Moneda FIAT: ${fiat} ${getFiatEmoji(fiat)}`);
    if (amount && amount !== "0") lines.push(`Importe: ${amount} ${fiat}`);
    if (margin)
      lines.push(
        `Margen: ${margin === "0%" ? "A precio de mercado" : `*${margin}* respecto al mercado`}`,
      );
    if (method) lines.push("", "Método de pago", method);

    lines.push("", "_Puedes cancelar con /exit._", "", `• *${prompt}*`);

    return lines.join("\n");
  },
  wizardFinishedPrompt: "Proceso de creación terminado.",
  channelOrder: ({
    chain,
    action,
    amountFiat,
    fiat,
    payDirection,
    method,
    daysUsing,
    margin,
    ratingLabel,
    id,
  }: {
    action: string;
    chain: string;
    amountFiat: string;
    fiat: string;
    payDirection: string;
    method: string;
    daysUsing: number;
    margin: number;
    ratingLabel: string;
    id: string;
  }) =>
    `*${action} BTC*\n\n` +
    `Por ${amountFiat} · ${fiat} ${getFiatEmoji(fiat)}\n` +
    `${payDirection} ${method}\n\n` +
    `Red: ${chain}\n\n` +
    `${margin === 0 ? "A precio de mercado" : `*${margin > 0 ? "+" : ""}${margin} %* sobre el precio de mercado`}\n\n` +
    `${daysUsing} días · ${ratingLabel}\n` +
    `ID: \`${id}\``,
  orderPublishedSuccess: (orderId: string) =>
    "✅ *¡Orden publicada exitosamente en el canal!*\n" +
    "Puedes cancelarlo usando `/cancel " +
    orderId +
    "`\n" +
    "👉 " +
    Strings.OrderChannelTag,
  listOrders: (list: OrderRow[]) => {
    if (list.length === 0) return "📭 No tienes órdenes registradas.";

    const blocks = list.map((o) => {
      const typeLabel = o.type === "SELL" ? "🔴 Venta" : "🟢 Compra";
      const statusLabel = OrderStatusLabelsES[o.status] || o.status;
      const marginLabel =
        o.margin === 0
          ? "Precio de mercado"
          : `${o.margin > 0 ? "+" : ""}${o.margin}%`;
      const createdDate = new Date(o.createdAt).toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      return [
        `📄 Orden: \`${o.id}\``,
        `Tipo: \`${typeLabel}\``,
        `Fiat: \`${o.fiatCode}\``,
        `Monto: \`${o.amountFiat} ${o.fiatCode}\``,
        `Margen: \`${marginLabel}\``,
        `Estado: \`${statusLabel}\``,
        `Creada: \`${createdDate}\``,
      ].join("\n");
    });

    return blocks.join(
      "\n\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n\n",
    );
  },
  orderExpiredCancelled: (orderId: string) =>
    `⌛ *Orden expirada*\n\nTu orden \`${orderId}\` ha superado las 24 horas publicada sin ser tomada. Ha sido cancelada automáticamente y retirada del canal.`,

  // ─────────────────────────── Matchmaking & Confirmations ───────────────────────────
  orderTaken: "⚠️ Esta orden ya fue tomada por otra persona.",
  cantTakeOwnOrder: "❌ No puedes tomar tu propia orden.",
  takerAskConfirm: ({
    type,
    fiat,
    amount,
    margin,
    method,
    network,
    id,
  }: {
    type: string;
    fiat: string;
    amount: string;
    margin: number;
    method: string;
    network: string;
    id: string;
  }) =>
    `*Confirmar orden · ${type} BTC*\n\n` +
    `Red: ${network}\n` +
    `Importe: ${amount} ${fiat} ${getFiatEmoji(fiat)}\n` +
    `Margen: ${margin === 0 ? "A precio de mercado" : `*${margin > 0 ? "+" : ""}${margin}%* respecto al mercado`}\n` +
    `Método de pago: ${method}\n\n` +
    `• *¿Confirmas que deseas continuar?*\n\n` +
    `ID: \`${id}\``,
  makerAskConfirm: ({
    type,
    fiat,
    amount,
    margin,
    method,
    network,
    trades,
    days,
    ratingLabel,
    id,
  }: {
    type: string;
    fiat: string;
    amount: string;
    margin: number;
    method: string;
    network: string;
    trades: number;
    days: number;
    ratingLabel: string;
    id: string;
  }) =>
    `📩 *Nueva solicitud · ${type} BTC*\n\n` +
    `Alguien quiere tomar tu orden.\n\n` +
    `Red: ${network}\n` +
    `Importe: ${amount} ${fiat} ${getFiatEmoji(fiat)}\n` +
    `Margen: ${margin === 0 ? "A precio de mercado" : `*${margin > 0 ? "+" : ""}${margin}%* respecto al mercado`}\n` +
    `Método de pago: ${method}\n\n` +
    `👤 *Datos de la contraparte*\n` +
    `Operaciones: ${trades}\n` +
    `Antigüedad: ${days} días\n` +
    `Reputación: ${ratingLabel}\n\n` +
    `• *¿Deseas confirmar e iniciar el intercambio?*\n\n` +
    `ID: \`${id}\``,
  promptExactAmount: (range: string, fiat: string) =>
    `Esta orden permite un rango de **${range} ${fiat}**.\n\n` +
    `💬 *Por favor, escribe en el chat el monto exacto* por el que deseas hacer el intercambio (solo números):`,
  askBuyerAddress: (estimatedSats: number) =>
    "📍 *Por favor, envía tu dirección de Bitcoin on-chain* donde recibirás los fondos.\n_(Asegúrate de que sea correcta, no nos hacemos responsables por errores)_\n\n" +
    "La cantidad estimada a recibir es de: `" +
    estimatedSats / 100_000_000 +
    "` BTC antes de comisiones de red.",
  askBuyerInvoice: (estimatedSats: number) =>
    "⚡ *Por favor, envía tu factura Lightning* (BOLT11) *o tu dirección Lightning* (usuario@dominio) donde recibirás los fondos.\n_(Asegúrate de que sea correcta y no haya expirado, no nos hacemos responsables por errores)_\n\n" +
    "La factura debe ser de exactamente `" +
    estimatedSats +
    "` sats.",
  payoutDetailsUpdated: (orderId: string) =>
    `✅ *Datos de cobro actualizados.*\n\nYa puedes reclamar los fondos con \`/claim ${orderId}\``,
  waitMaker:
    "⏳ Perfecto. Por favor, *espera a que la contraparte confirme* si desea continuar con la orden.",
  waitTaker:
    "⏳ Datos de pago guardados. Ahora *espera a que el vendedor deposite* los fondos en el escrow.",
  acceptedNowWaitingEscrow: `✅ *Orden aceptada.*\n\n⏳ Esperando a que el vendedor envíe los fondos al escrow, puede tomar varios minutos...`,

  // ─────────────────────────── Escrow & Network ───────────────────────────
  missingPubkeys:
    "❌ Error crítico: Faltan llaves públicas para generar el escrow.",
  askSellerEscrow: (sats: number, address: string) =>
    `⚡ *Fondeo de escrow Requerido*\n\n` +
    `Por favor, envía \`${sats / 100_000_000}\` BTC a la siguiente dirección on-chain:\n\n` +
    `\`${address}\`\n` +
    `Te recomendamos respaldar los datos de este escrow ahora por si los llegas a necesitar. (/backup)\n\n` +
    `_Una vez se confirme la transacción (${formatConfirmations("es")}), los pondremos en contacto. Por favor, asegurate de enviar la cantidad EXACTA, de no ser así, podría requerir atención manual._`,
  askSellerLightningEscrow: (sats: number, invoice: string) =>
    `⚡ *Pago Lightning requerido*\n\n` +
    `Paga la siguiente factura por exactamente \`${sats}\` sats:\n\n` +
    `\`${invoice}\`\n\n` +
    `_Es una factura de retención (hold invoice): el pago quedará bloqueado en tu wallet y no se cobrará hasta que el comprador confirme la operación. Si la orden se cancela, el pago se libera automáticamente._`,
  escrowUnconfirmed: (escrowAddress: string) =>
    `⏳ *Transacción detectada en la red.*\n\n` +
    `[Ver en el explorador](${mempoolBaseURL}/address/${escrowAddress}) \n` +
    `_Esperando ${formatConfirmations("es")} para poder proceder seguramente con la orden..._`,
  escrowFundingFailed: (
    utxoCount: number,
    totalFundedSats: number,
    expectedSats: number,
    orderId: string,
  ) =>
    `❌ *Fondeo fallido*\n\nSe han detectado ${utxoCount} depósitos pero el monto sigue siendo inferior al esperado (${totalFundedSats / 100_000_000} BTC recibidos de ${expectedSats / 100_000_000} BTC requeridos). El límite máximo es de 2 transacciones.\n\nLa orden ha sido cancelada. Ejecuta \`/claim ${orderId}\` para solicitar el reembolso de tus fondos.`,
  incompleteFunding: (
    totalFundedSats: number,
    expectedSats: number,
    remainingSats: number,
  ) =>
    `⚠️ *Depósito incompleto*\n\nHemos detectado la llegada de ${totalFundedSats / 100_000_000} BTC, pero la orden requiere ${expectedSats / 100_000_000} BTC.\n\nFaltan por depositar: \`${remainingSats / 100_000_000}\` BTC.\n\n_Cuentas con 1 intento de envío adicional. Si el segundo depósito no completa la cantidad requerida, la orden se cancelará y pasará a reembolso._`,
  fundingExpired:
    "⚠️ Tu orden ha expirado por no completar el depósito a tiempo. Usa /claim para reembolsar los fondos parciales enviados.",
  sellerDidNotFund: (orderId: string) =>
    `⚠️ *El vendedor no depositó*\n\nEl usuario que tomó tu orden \`${orderId}\` no realizó el depósito en el tiempo establecido. Tu oferta ha sido republicada en el canal.`,
  partialDepositCancelled:
    "❌ Has cancelado la orden con un depósito parcial. Usa /claim para solicitar el reembolso de los fondos enviados.",
  orderCancelledSellerFunding: `❌ *Orden cancelada*\n\nEl vendedor no completó el depósito correctamente dentro del límite de envíos permitidos. La orden ha sido cancelada automáticamente y los fondos le serán reembolsados a su dueño.`,
  orderCancelledTransactionDisappeared:
    "❌ *Orden cancelada*\n\nLa transacción ha desaparecido de la red (RBF o eliminada de la mempool).",
  orderCancelledSellerDepositReverted:
    "❌ *Orden cancelada*\n\nEl depósito del vendedor fue revertido o desapareció de la red.",
  tamperingDetected:
    "❌ *Manipulación detectada*\n\nSe detectó una reversión parcial de los fondos en la red. La orden ha sido cancelada. Ejecuta /claim para recuperar el saldo restante en el escrow.",
  orderCancelledDepositAltered:
    "❌ *Orden cancelada*\n\nEl depósito fue alterado en la red antes de confirmarse. El acuerdo ha sido abortado por tu seguridad.",
  escrowConfirmedBuyer: (sellerContact: string, orderId: string) =>
    `✅ *¡Escrow Fondeado y Confirmado!*\n\n` +
    `Los fondos están asegurados en la bóveda segura.\n\n` +
    `🗣 **Contacta al vendedor aquí:** ${sellerContact}\n\n` +
    `_Instrucciones: Realiza el pago por el método acordado. Una vez transferido el dinero, ejecuta el comando_ \`/fiatsent ${orderId}\` _para notificar al vendedor._`,
  escrowConfirmedSeller: (buyerContact: string, orderId: string) =>
    `✅ *¡Escrow Fondeado y Confirmado!*\n\n` +
    `Tus fondos están asegurados en la bóveda segura.\n\n` +
    `🗣 **Contacta al comprador aquí:** ${buyerContact}\n\n` +
    `_Instrucciones: Espera el pago del comprador. Una vez que verifiques que el dinero está en tu cuenta, ejecuta el comando_ \`/release ${orderId}\` _para liberar los fondos._`,
  feesList: (
    botFee: string,
    feesData: MempoolFeesData,
    customFee?: number | null,
  ) =>
    "⚡ *Tarifas de Red (Mempool)*\n\n" +
    "┌ ▸ Rápida 🚀\n" +
    `│   \`${feesData.fastestFee}\` sat/vB\n` +
    "├ ▸ Media ⚡\n" +
    `│   \`${feesData.halfHourFee}\` sat/vB\n` +
    "├ ▸ Lenta 🐢\n" +
    `│   \`${feesData.hourFee}\` sat/vB\n` +
    "└ ▸ *Económica* ✅ *(usada por defecto)*\n" +
    `    \`${feesData.economyFee}\` sat/vB\n\n` +
    (customFee
      ? `🎯 *Tu Tarifa Personalizada* ✅ *(activa)*\n   \`${customFee}\` sat/vB\n\n`
      : "") +
    "━━━━━━━━━━━━━━━━━━━━\n\n" +
    "🤖 *Comisión del Bot*\n" +
    `   \`${botFee}%\`\n` +
    "   └ Se divide 50/50 entre ambas partes\n\n" +
    "💡 " +
    (customFee
      ? "Estás usando tu tarifa de red personalizada en lugar de la económica. Puedes actualizarla cuando quieras con /setfee."
      : "La tarifa económica es suficiente para que la transacción se confirme en las próximas horas sin pagar de más."),
  customFeeChanged: (newFee: number) =>
    `✅ La comisión de red ha sido establecida a ${newFee} sats/vB`,
  couldNotFetchFees:
    "❌ No se ha podido conseguir las fees actuales, inténtalo de nuevo más tarde.",
  resetFeeButton: "♻️ Volver por defecto (Económica)",
  feeResetSuccess:
    "✅ Tu tarifa ha vuelto a la configuración económica por defecto.",
  errorProcessingTx: (err: string) => `❌ *Error en la red:*\n\`${err}\``,

  // ─────────────────────────── Fiat & Release ───────────────────────────
  selectReleasableOrder:
    "👇 Selecciona la orden de la cual deseas liberar los fondos en Bitcoin:",
  noReleasableOrdersFound:
    "📭 No tienes órdenes pendientes por liberar.\n\nDebes esperar a que el comprador realice el pago y lo confirme usando `/fiatsent`.",
  selectOrderToMarkAsPaid:
    "👇 Selecciona la orden que deseas marcar como pagada:",
  noActiveOrdersFound:
    "📭 No tienes órdenes activas pendientes de pago.\n\nDebes esperar a que el vendedor deposite los fondos en la bóveda o tomar una nueva oferta.",
  fiatSentToBuyer: (orderId: string) =>
    `✅ Has marcado la orden \`${orderId}\` como pagada.\n\n` +
    `El vendedor ha sido notificado. Por favor espera a que confirme la recepción en su cuenta y libere los fondos.`,
  fiatSentToSeller: (orderId: string, buyerName: string) =>
    `🔔 *¡Pago reportado por el comprador!*\n\n` +
    `${buyerName} indica que ya envió el pago FIAT a tu cuenta.\n\n` +
    `**INSTRUCCIONES:**\n` +
    `1. Revisa tu cuenta bancaria o método de pago acordado.\n` +
    `2. Confirma que el monto es correcto.\n` +
    `3. Si todo está bien, libera los Bitcoins ejecutando:\n\n` +
    `\`/release ${orderId}\``,
  askReleaseConfirmation: (
    buyerName: string,
    orderId: string,
    fiatAmount: string,
    fiatCode: string,
  ) =>
    `⚠️ *Confirmación de Liberación*\n\n` +
    `Estás a punto de liberar los fondos en Bitcoin de la bóveda a favor de @**${buyerName}**.\n\n` +
    `📋 *Detalles de la Orden:*\n` +
    `• *ID de Orden:* \`#${orderId}\`\n` +
    `• *Monto a verificar:* **${fiatAmount} ${fiatCode}**\n\n` +
    `🏦 *Antes de continuar, es estrictamente necesario que inicies sesión en tu cuenta bancaria o billetera y verifiques por ti mismo que el pago ha sido acreditado correctamente.*\n\n` +
    `_Recuerda que una vez liberados, los fondos en Bitcoin no podrán ser recuperados bajo ninguna circunstancia._\n\n` +
    `¿Deseas confirmar la liberación definitiva de los fondos?`,
  releaseSuccessSeller: (orderId: string) =>
    `✅ Has autorizado la liberación de la orden \`${orderId}\`.\n\n` +
    `El comprador ha sido notificado para que firme y reclame su Bitcoin. ¡Gracias por usar el servicio!`,
  releaseToBuyer: (orderId: string) =>
    `🎉 *¡El vendedor ha liberado los fondos!*\n\n` +
    `El escrow está listo para ser reclamado. Ejecuta el siguiente comando para iniciar el retiro a tu billetera:\n\n` +
    `\`/claim ${orderId}\``,
  rangeOrderPartiallyCompleted: (
    newOrderId: string,
    newAmountFiat: string,
    fiatCode: string,
  ) =>
    `ℹ️ Tu orden de rango ha sido completada parcialmente. Se ha republicado una nueva orden (\`${newOrderId}\`) por el saldo restante: *${newAmountFiat} ${fiatCode}* en ${Strings.OrderChannelTag}.`,

  // --------------------------- Rating -----------------------------------
  rateCounterpartyMessage: "👉 Por favor, califica a tu contraparte:",
  ratingDone: (stars: number) =>
    `⭐ Has calificado a tu contraparte con ${stars} estrellas.`,

  // --------------------------- Backup -----------------------------------
  noBackupOrdersFound:
    "📭 No tienes órdenes activas con un escrow generado para respaldar.",
  selectOrderForBackup:
    "🔐 Selecciona la orden de la cual deseas obtener el respaldo del escrow:",
  orderBackup: (data: {
    orderId: string;
    escrowAddress: string;
    descriptor: string;
    escrowIndex: number;
    userXpub: string;
    userFingerprint: string;
  }) =>
    `🔐 *Respaldo de Escrow — Orden* \`${data.orderId}\`\n\n` +
    `📍 *Dirección Escrow:*\n\`${data.escrowAddress}\`\n\n` +
    `🔢 *Índice de derivación:* \`/0/${data.escrowIndex}\`\n\n` +
    `🔑 *Tu xpub:*\n\`${data.userXpub}\`\n\n` +
    `🆔 *Tu fingerprint:* \`${data.userFingerprint}\`\n\n` +
    `🧬 *Output Descriptor:*\n` +
    "```\n" +
    `${data.descriptor}\n` +
    "```\n\n" +
    `⚠️ *Nota:* Guarda este respaldo junto con tus 12 palabras. Con ambos podrás importar la bóveda multifirma y firmar desde una billetera externa si fuera necesario, o si así deseas hacerlo.`,

  // ─────────────────────────── Claim & Refund ───────────────────────────
  selectClaimableOrder:
    "👇 Selecciona la orden de la cual deseas reclamar los fondos:",
  selectAddressChangeableOrder:
    "👇 Selecciona la orden la cual desear modificar la dirección de pago:",
  noClaimableOrdersFound:
    "📭 No tienes órdenes las cuales puedas reclamar o cambiar su dirección de pago.",
  showClaimPreview: (
    minerFee: number,
    finalAmount: number,
    receivingAddress: string,
    minerFeeRate: number,
  ) =>
    `🔐 *Reclamar Fondos*\n\n` +
    `**Desglose de la transacción:**\n` +
    `├ Dirección: \`${receivingAddress}\`\n` +
    `├ Comisión minera (est): \`-${minerFee / 100_000_000} BTC\` (${minerFeeRate} sats/vB)\n` +
    `└ **Recibirás aprox:** \`${finalAmount / 100_000_000} BTC\`\n\n` +
    `💡 *Nota:* Si no estás de acuerdo con la comisión minera, puedes usar /setfee para establecer tu propia tarifa y volver a usar /claim.\n\n` +
    `Escoge de qué forma quieres firmar esta transacción 👇`,
  btnSignWithPassword: "🔑 Escribir contraseña",
  btnSignExternally: "✍️ Firmar externamente",
  typePassword: "Escribe tu contraseña:",
  externalSignInstructions:
    `✍️ *Firma Externa (PSBT)*\n\n` +
    `La transacción ya cuenta con la firma del bot. Sigue estos pasos para completarla:\n\n` +
    `1. Importa las 12 palabras que se generaron cuando creaste tu contraseña en una billetera compatible con PSBT (como Sparrow Wallet o BlueWallet).\n` +
    `2. Importa el descriptor del escrow multifirma 2-de-3 usando /backup *(solo si tu billetera te lo solicita para reconocer los fondos)*.\n` +
    `3. Carga el archivo \`.psbt\` adjunto, firma la transacción, transmítela a la red (broadcast) y presiona el botón de abajo para confirmar.`,
  btnConfirmExternalBroadcast: "✅ Ya transmití la transacción",
  orderExternallySigned: (orderId: string, txid?: string | null) =>
    `✍️ *Firma externa detectada*\n\n` +
    `Los fondos de la orden \`${orderId}\` ya fueron retirados mediante una transacción externa.` +
    (txid
      ? `\n\n🔎 [Ver TX en el explorador](${mempoolBaseURL}/tx/${txid})`
      : ""),
  externalBroadcastNotDetected:
    "⏳ Aún no detectamos la salida de los fondos en la red. Asegúrate de haber transmitido (broadcast) la transacción firmada e inténtalo de nuevo en unos segundos.",
  psbtSigningLoading: `⏳ *Co-firmando y transmitiendo a la red...*`,
  claimSuccess: (txid: string) =>
    `🎉 *¡Retiro Exitoso!*\n\nLos fondos van camino a tu billetera.\n🔎 [Ver TX](${mempoolBaseURL}/tx/${txid})`,
  askRefundAddress: `📍 Por favor, envía la dirección de Bitcoin a la que deseas recibir tu reembolso:`,
  refundSuccess: (txid: string) =>
    `🎉 *¡Reembolso Exitoso!*\n\nTus fondos van de vuelta a tu billetera.\n🔎 [Ver TX](${mempoolBaseURL}/tx/${txid})`,
  refundCompletedNotification: (orderId: string) =>
    `ℹ️ *Orden Cancelada*\n\nEl vendedor reclamó el reembolso de la orden \`${orderId}\`. Los fondos del escrow fueron devueltos.`,
  lightningClaimLoading: `⚡ *Liquidando la factura de retención y enviando tu pago...*`,
  lightningRefundLoading: `⚡ *Cancelando la factura de retención y liberando tu reembolso...*`,
  lightningPayoutSuccess: (paymentHash: string) =>
    `🎉 *¡Retiro exitoso!*\n\nEl pago fue enviado por la red Lightning.\n🔎 Hash de pago: \`${paymentHash}\``,
  lightningRefundSuccess: () =>
    `🎉 *¡Reembolso exitoso!*\n\nLa factura de retención fue cancelada y tus fondos quedaron liberados en tu wallet.`,
  lightningInProgress:
    "⏳ Ya hay una operación en curso para esta orden. Espera unos segundos e inténtalo de nuevo.",
  lightningAlreadyProcessed: "ℹ️ Esta orden ya fue procesada.",
  lightningInvoiceExpired:
    "❌ La factura o dirección Lightning de cobro ya no es válida o expiró. Usa el comando /setaddress para actualizar la factura.",
  lightningPaymentFailed:
    "❌ No se pudo completar la operación Lightning. Inténtalo de nuevo en unos minutos; si persiste, usa el comando /setaddress para probar con otra factura.",

  // ─────────────────────────── Cancellations ───────────────────────────
  selectOrderToCancel:
    "👉 Selecciona la orden que quieres cancelar, puedes ver los detalles con /listorders",
  cancelNotAllowed: `❌ No puedes cancelar la orden en este estado. Si el pago ya fue enviado, deberás abrir una disputa.`,
  cancelUnconfirmed: `⏳ La orden tiene una transacción sin confirmar en la red. Debes esperar ${formatConfirmations("es")} antes de iniciar una cancelación.`,
  cancelAlreadyRequested: `⏳ Ya solicitaste la cancelación. Esperando a que tu contraparte acepte y firme.`,
  cancelOnlySeller: `❌ Solo el vendedor puede cancelar la orden en este estado.`,
  cancelAddressWait:
    "❌ Debes esperar al menos 10 minutos desde que se generó la dirección antes de cancelar, para prevenir colisiones con transacciones en tránsito.",
  counterpartyCanceledDeleted: (orderId: string) =>
    `🚫 Tu contraparte ha cancelado la orden \`${orderId}\`.`,
  matchCancelledRepublished: (orderId: string) =>
    `🚫 Tu contraparte canceló el acuerdo de la orden \`${orderId}\`.\n\nLa orden ha vuelto a publicarse en el canal para que otro usuario pueda tomarla.`,
  cancelNotifiedCounterparty: (orderId: string) =>
    `🔔 *Solicitud de Cancelación*\n\nTu contraparte ha solicitado cancelar la orden \`${orderId}\`. Si estás de acuerdo, ejecuta \`/cancel ${orderId}\` para confirmar y reembolsar los fondos al vendedor.\n\n` +
    `⚠️ Si ya has hecho el pago, abre una disputa, no aceptes la cancelación: \`/dispute ${orderId}\``,
  cancelAccepted: (orderId: string) =>
    `✅ *Cancelación confirmada.*\n\nLa orden \`${orderId}\` ha sido cancelada de mutuo acuerdo. Los fondos serán reembolsados al vendedor.`,
  cancelAcceptedSeller: (orderId: string) =>
    `✅ *Cancelación confirmada.*\n\nLa orden \`${orderId}\` ha sido cancelada de mutuo acuerdo. Puedes reclamar el reembolso de tus fondos ejecutando:\n\n\`/claim ${orderId}\``,
  cancelRequestSuccess: `✅ Has solicitado la cancelación. Esperando a que tu contraparte la apruebe con /cancel.`,
  orderCancelled: "🚫 La orden ha sido cancelada.",

  // ─────────────────────────── Disputes ───────────────────────────
  disputeNotAllowed: `❌ No puedes abrir una disputa en el estado actual de la orden. Las disputas solo aplican a órdenes con fondos activos en el escrow.`,
  disputeAlreadyOpen: `⚠️ Ya existe una disputa abierta para esta orden.`,
  disputeOpened: (code: string, orderId: string) =>
    `⚖️ *Tu disputa ha sido abierta.*\n\n` +
    `Orden: \`${orderId}\`\n\n` +
    `Tu código de verificación es: \`${code}\`\n\n` +
    `Este código sirve *únicamente* para comprobar la identidad del administrador que tome tu disputa.\n\n` +
    `⚠️ *IMPORTANTE:* ningún administrador te escribirá antes de que el bot te notifique oficialmente quién ha tomado tu disputa. Si alguien afirma ser administrador antes de esa notificación, no continúes la conversación.`,
  disputeAdminGroupMessage: ({
    orderId,
    type,
    fiatCode,
    amountFiat,
    status,
    network,
    holdInvoice,
    escrowAddress,
    buyerUsername,
    sellerUsername,
    buyerCode,
    sellerCode,
  }: {
    orderId: string;
    type: string;
    fiatCode: string;
    amountFiat: string;
    status: string;
    network: string;
    holdInvoice?: string | undefined;
    escrowAddress: string;
    buyerUsername: string;
    sellerUsername: string;
    buyerCode: string;
    sellerCode: string;
  }) =>
    `⚖️ *NUEVA DISPUTA*\n\n` +
    `Orden: \`${orderId}\`\n` +
    `Tipo: ${type}\n` +
    `Red: ${network}\n` +
    `Monto: ${amountFiat} ${fiatCode}\n` +
    `Estado previo: \`${status}\`\n` +
    (holdInvoice
      ? `Factura de retención: \`${holdInvoice}\`\n\n`
      : `Escrow: \`${escrowAddress}\`\n\n`) +
    `👤 Comprador: @${buyerUsername}\n` +
    `👤 Vendedor: @${sellerUsername}\n\n` +
    `🔑 Código verificación comprador: \`${buyerCode}\`\n` +
    `🔑 Código verificación vendedor: \`${sellerCode}\`\n\n` +
    `Para tomar esta disputa, ejecuta:\n\`/takedispute ${orderId}\``,
  disputeNotFoundOrNotOpen: `❌ Esta orden no existe o no está actualmente en disputa.`,
  disputeAlreadyTaken: `⚠️ Esta disputa ya fue tomada por otro administrador.`,
  disputeTakenSuccessAdmin: (orderId: string) =>
    `✅ Has tomado la disputa de la orden \`${orderId}\`. Ambas partes fueron notificadas.\n\nCuando tengas una resolución, ejecuta:\n\`/settle ${orderId}\``,
  disputeTakenNotification: (
    adminHandle: string,
    code: string,
    orderId: string,
  ) =>
    `⚖️ *Disputa Asignada*\n\n` +
    `La disputa de la orden \`${orderId}\` ha sido tomada por *${adminHandle}*.\n\n` +
    `Tu código de verificación: \`${code}\`\n\n` +
    `⚠️ Ningún administrador te escribió antes de este mensaje. Antes de compartir cualquier información:\n` +
    `1️⃣ Verifica que el username coincide con el de este mensaje.\n` +
    `2️⃣ Pídele que te diga tu código de verificación.\n` +
    `3️⃣ El código debe coincidir exactamente con el de arriba.\n\n` +
    `El código por sí solo no le da ningún permiso al administrador ni modifica tu disputa.`,
  disputeTakenNotificationNoCode: (adminHandle: string, orderId: string) =>
    `⚖️ *Disputa Asignada*\n\n` +
    `La disputa de la orden \`${orderId}\` ha sido tomada por *${adminHandle}*.\n\n` +
    `⚠️ Ningún administrador te escribió antes de este mensaje. Verifica que el username coincida exactamente con el de arriba antes de compartir cualquier información con quien te contacte.`,
  adminOnlyAction: `❌ Solo un administrador autorizado puede ejecutar esta acción.`,
  settleNotFoundOrNotInDispute: `❌ Esta orden no existe o no está en disputa.`,
  settleNotAssignedAdmin: `❌ Solo el administrador asignado a esta disputa puede resolverla.`,
  settleStaleAction: `⚠️ Esta disputa ya fue resuelta anteriormente. Este botón ya no es válido.`,
  settlePrompt: (orderId: string, buyerHandle: string, sellerHandle: string) =>
    `⚖️ *Resolver disputa* \`${orderId}\`\n\n` +
    `👤 Comprador: ${buyerHandle}\n` +
    `👤 Vendedor: ${sellerHandle}\n\n` +
    `Selecciona una resolución:`,
  settleBtnBuyer: (buyerHandle: string) =>
    `✅ A favor del comprador (${buyerHandle})`,
  settleBtnSeller: (sellerHandle: string) =>
    `✅ A favor del vendedor (${sellerHandle})`,
  settleBtnRefund: `↩️ Cancelar orden / Reembolsar al vendedor`,
  settleResolvedAdmin: (orderId: string, resolution: string) =>
    `✅ Disputa \`${orderId}\` resuelta: *${resolution}*.\n\nAmbas partes fueron notificadas.`,
  settleBuyerWinsNotifyBuyer: (orderId: string) =>
    `⚖️ *Disputa resuelta a tu favor.*\n\nLa orden \`${orderId}\` fue resuelta a favor del comprador. Ya puedes reclamar tus fondos ejecutando:\n\n\`/claim ${orderId}\``,
  settleBuyerWinsNotifySeller: (orderId: string) =>
    `⚖️ *Disputa resuelta.*\n\nLa orden \`${orderId}\` fue resuelta a favor del comprador. Los fondos del escrow serán liberados hacia su dirección.`,
  settleSellerWinsNotifySeller: (orderId: string) =>
    `⚖️ *Disputa resuelta a tu favor.*\n\nLa orden \`${orderId}\` fue resuelta a tu favor. Puedes recuperar tus fondos ejecutando:\n\n\`/claim ${orderId}\``,
  settleSellerWinsNotifyBuyer: (orderId: string) =>
    `⚖️ *Disputa resuelta.*\n\nLa orden \`${orderId}\` fue resuelta a favor del vendedor. Los fondos del escrow serán devueltos a su dueño original.`,
  settleCancelledNotifyBuyer: (orderId: string) =>
    `↩️ *Disputa resuelta: orden cancelada.*\n\nEl administrador determinó cancelar la orden \`${orderId}\`. Los fondos serán devueltos al vendedor.`,
  settleCancelledNotifySeller: (orderId: string) =>
    `↩️ *Disputa resuelta: orden cancelada.*\n\nEl administrador determinó cancelar la orden \`${orderId}\`. Los fondos podrán ser reembolsados usando el comando \`/claim ${orderId}\`.`,
  settleResolutionBuyerLabel: "A favor del comprador",
  settleResolutionSellerLabel: "A favor del vendedor",
  settleResolutionRefundLabel: "Cancelar / Reembolsar al vendedor",

  // ─────────────────────────── Errors & Validations ───────────────────────────
  noOrdersFound: "❌ No se han encontrado ordenes creadas por ti.",
  orderNotFound: `❌ Orden no encontrada.`,
  invalidOrderStatus: `❌ No puedes realizar esta acción en la etapa actual de la orden.`,
  waitForBuyerFiatSent: (orderId: string) =>
    "❌ Debes de notificar al comprador que marque la orden como pagada con `/fiatsent " +
    orderId +
    "`",
  onlyBuyer: `❌ Solo el comprador puede realizar esta acción.`,
  onlySeller: `❌ Solo el vendedor puede autorizar esta acción.`,
  unauthorizedAccess: `❌ No tienes permisos sobre esta orden.`,
  invalidPassword: (retryCommand: string) =>
    `❌ Contraseña incorrecta. Por favor intenta de nuevo con \`${retryCommand}\``,
  invalidAmountRange: (min: number, max: number) =>
    `❌ El monto es inválido. Debe ser un número entre **${min}** y **${max}**.\nIntenta de nuevo:`,
  invalidAmountRangeOrder:
    "❌ El monto mínimo no puede ser mayor que el monto máximo.\nIntenta de nuevo:",
  fiatValueBelowMinimun: (fiatCode: string, minValue: number) =>
    `❌ La cantidad para ${fiatCode} debe ser al menos ${minValue}. Intenta de nuevo:`,
  fiatValueTooBig:
    "❌ El monto es demasiado grande para ser procesado por el sistema.",
  invalidRefundAddress:
    "❌ Esa dirección de Bitcoin no es válida. Por favor, envíala de nuevo:",
  invalidBuyerAddress:
    "❌ Esa dirección de Bitcoin no es válida. Por favor, envía una dirección correcta:",
  invalidBuyerInvoice:
    "❌ Esa factura Lightning no es válida o ya expiró. Por favor, envía una factura o dirección Lightning válida:",
  invalidBuyerInvoiceAmount: (expectedSats: number, receivedSats: number) =>
    `❌ La factura debe ser por exactamente *${expectedSats.toLocaleString()} sats*. La factura recibida es por *${receivedSats.toLocaleString()} sats*.\nIntenta de nuevo:`,
  invalidLightningAddressAmount: (expectedSats: number) =>
    `❌ Esa dirección Lightning no acepta pagos de exactamente *${expectedSats.toLocaleString()} sats*. Envía otra factura o dirección Lightning:`,
  maxOrdersReached: "❌ Haz alcanzado el límite de órdenes creadas por ti.",
  invalidFiatCode: "❌ El código fiat no fue reconocido, intenta de nuevo:",
  orderAlreadyRated: "❌ La contraparte ya había sido calificada.",
  couldNotApplyMargin:
    "❌ Error desconocido al aplicar el margen, intenta de nuevo.",
  couldNotFetchPrice:
    "❌ Error desconocido al buscar el código de la moneda, intenta de nuevo:",
  priceApiErrorRepublish:
    "❌ *Error de conexión al calcular el precio.*\n\nEl acuerdo fue cancelado y la orden se ha vuelto a publicar automáticamente en el canal. Por favor, inténtalo de nuevo más tarde.",
  makerTimeoutNotifyMaker: (orderId: string) =>
    `❌ *Orden cancelada por inactividad*\n\nTu orden \`${orderId}\` ha sido cancelada porque no confirmaste la solicitud a tiempo.`,
  makerTimeoutNotifyTaker: (orderId: string) =>
    `❌ *Orden cancelada*\n\nEl creador de la orden \`${orderId}\` no respondió a tiempo. La orden ha sido cancelada.`,
  takerTimeoutNotifyTaker: (orderId: string) =>
    `⏳ *Tiempo agotado*\n\nTu tiempo para completar los detalles de la orden \`${orderId}\` ha expirado. La orden fue republicada en el canal; si aún deseas proceder, deberás tomarla nuevamente.`,
  alreadyHaveActiveOrder:
    "❌ Ya tienes una orden en proceso. Debes terminarla o cancelarla antes de tomar otra.",
  invalidCustomFee:
    "❌ El valor debe ser igual o mayor a 1, menor a 500 y tener hasta 2 decimales.",
};
