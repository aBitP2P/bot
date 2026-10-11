import { Strings, OrderStatus, getFiatEmoji } from "../shared/constants.js";
import { mempoolBaseURL, type MempoolFeesData } from "../core/bitcoin/index.js";
import { MIN_SATS } from "../utils/price.js";
import type { LoanDraft } from "../wizards/types.js";
import type { OrderRecord, UserRecord } from "../types.js";
import { escapeMarkdown } from "../utils/format.js";

export const OrderStatusMap: Record<string, string> = {
  [OrderStatus.Pending]: "⏳ Pendiente",
  [OrderStatus.WaitingTakerConfirmation]: "⏳ Esperando confirmación",
  [OrderStatus.WaitingMakerConfirmation]: "⏳ Esperando confirmación",
  [OrderStatus.WaitingEscrow]: "📥 Esperando depósito",
  [OrderStatus.Unconfirmed]: "🔄 Confirmando en la red",
  [OrderStatus.Active]: "🟢 Activa",
  [OrderStatus.CancelRequested]: "⚠️ Cancelación solicitada",
  [OrderStatus.FiatSent]: "💸 Fiat enviado",
  [OrderStatus.Releasable]: "🔓 Lista para liberar",
  [OrderStatus.Refundable]: "↩️ Lista para reembolso",
  [OrderStatus.Dispute]: "⚖️ En disputa",
  [OrderStatus.Completed]: "✅ Completada",
  [OrderStatus.Refunded]: "↩️ Reembolsada",
  [OrderStatus.Cancelled]: "❌ Cancelada",
};

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
    `/cancel — Cancelar una orden\n` +
    `/dispute — Abrir disputa con moderación\n` +
    `_Ej: /release ab12cd-34ef56_\n\n` +
    `⚙️ *Cuenta y Sistema*\n` +
    `/setpass — Encripta tu perfil a partir de una contraseña\n` +
    `/backup — Exporta tus llaves y contratos de emergencia\n` +
    `/setlang — Cambia de idioma\n` +
    "/fees - Revisa como están las comisiones para tus órdenes\n" +
    "/setfee - Establece la comisión de red que se usará\n" +
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
    "❌ Primero debes establecer tu contraseña con /setpass para poder tomar o crear órdenes.",
  promptPassword:
    `*⚠️ Se generará una llave privada ligada a tu usuario, la contraseña SERÁ NECESARIA para reclamar las órdenes.*\n` +
    `*NO SE PUEDE CAMBIAR, asegúrate de escribirla correctamente y anotarla en un lugar seguro.*\n\n` +
    "🔑 *Por favor, escribe tu contraseña para configurar tu usuario:*",
  promptPasswordShort: "👇 Escribe la contraseña en el chat para firmar la transacción:",
  confirmPassword: "👉 Para confirmar, vuelve a escribir la contraseña: ",
  passwordsDoNotMatch:
    "❌ Las contraseñas no coinciden. Inténtalo de nuevo con /setpass",
  passwordAlreadySet: "❌ Ya tienes una contraseña establecida previamente.",
  passwordSetSuccess:
    `✅ *Contraseña configurada con éxito.* Perfil encriptado y listo para usar.\n\n` +
    `_Ten en cuenta que esta contraseña es solo para firmar retiros en el bot. Los fondos que adquieras se enviarán directamente a la dirección externa que proveas; el bot no custodia tus fondos._\n\n` +
    `⚠️ *IMPORTANTE:* Tu cuenta no es custodiada. Si pierdes tu cuenta de Telegram, perderás tus fondos. Ejecuta /backup ahora mismo para guardar tu llave privada encriptada.`,
  invalidLanguage: "❌ Idioma inválido.",
  selectLanguage: "👇 Selecciona tu idioma preferido",
  languageUpdateSuccess: "✅ Idioma actualizado correctamente.",

  // ─────────────────────────── Market & Order Creation ───────────────────────────
  promptFiat: "¿Qué moneda FIAT deseas usar? (Ej: USD, EUR, VES)",
  promptAmount: "Indica el monto o rango (Ej: 500-1000 o 100)",
  promptMargin: "Selecciona el margen en los botones de abajo 👇",
  promptPaymentMethod: "Escribe el método de pago (Ej: Zelle, Transferencia)",
  invalidAmountAfterMargin: ({
    margin,
    satsAmount,
    minFiatRequired,
    fiatCode,
  }: {
    margin: number;
    satsAmount: number;
    minFiatRequired: number;
    fiatCode: string;
  }) =>
    `⚠️ *Monto insuficiente tras aplicar margen*\n\n` +
    `Al aplicar tu margen del ${margin}%, el total a recibir bajó a ${satsAmount.toLocaleString()} sats.\n\n` +
    `Para cumplir con el mínimo de ${MIN_SATS.toLocaleString()} sats, debes iniciar la orden con al menos *$${minFiatRequired.toFixed(2)} ${fiatCode}*.\n\n` +
    `🔄 Por favor, inicia la creación de la orden nuevamente.`,
  wizardPreview: (
    type: string,
    fiat: string,
    amount: string,
    margin: string,
    method: string,
    prompt: string,
  ) =>
    `🛠 *Creando Orden (${type})*\n\n` +
    `▪️ Moneda: \`${fiat}\`\n` +
    `▪️ Monto/Rango: \`${amount}\`\n` +
    `▪️ Margen: \`${margin}\`\n` +
    `▪️ Método: \`${method}\`\n\n` +
    `_Usa /exit en cualquier momento para cancelar_\n\n` +
    `👉 *${prompt}*`,
  channelOrder: ({
    action,
    amountFiat,
    fiat,
    payDirection,
    ratingCount,
    method,
    daysUsing,
    hashtag,
    margin,
    rating,
    tradesCount,
    id,
  }: {
    action: string;
    amountFiat: string;
    fiat: string;
    payDirection: string;
    method: string;
    daysUsing: number;
    hashtag: string;
    margin: number;
    rating: number;
    tradesCount: number;
    id: string;
    ratingCount: number;
  }) =>
    `**${action} Bitcoin**\n\n` +
    `Por ${amountFiat.split("-").join(" - ")} ${fiat} ${getFiatEmoji(fiat)}\n` +
    `💳 ${payDirection} ${method}\n` +
    `📈 Tasa: ${margin === 0 ? "A precio de mercado" : `yadio.io ${margin > 0 ? "+" + margin : margin}%`}\n\n` +
    `👤 **Contraparte:**\n` +
    `▪️ ${tradesCount} operaciones exitosas\n` +
    `▪️ Usa el bot hace ${daysUsing} días\n` +
    `▪️ ${rating.toFixed(1)} ${"⭐".repeat(Math.floor(rating))} (${ratingCount})\n\n` +
    `${hashtag}\n` +
    `\`${id}\``,
  orderPublishedSuccess: (orderId: string) =>
    `✅ *¡Orden publicada exitosamente en el canal!*\n` +
    `Puedes cancelarla usando \`/cancel ${orderId}\`\n` +
    `👉 ${Strings.OrderChannelTag}`,
  listOrders: (list: OrderRecord[]) => {
    if (list.length === 0) return "📭 No tienes órdenes registradas.";

    const blocks = list.map((o) => {
      const typeLabel = o.type === "SELL" ? "🔴 Venta" : "🟢 Compra";
      const statusLabel = OrderStatusMap[o.status] || o.status;
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

      return (
        `📄 *Orden:* \`${o.id}\`\n` +
        `▪️ Tipo: ${typeLabel}\n` +
        `▪️ Monto: \`${o.fiatAmountLocked ?? o.amountFiat} ${o.fiatCode}\`\n` +
        `▪️ Margen: \`${marginLabel}\`\n` +
        `▪️ Estado: ${statusLabel}\n` +
        `▪️ Creada: ${createdDate}`
      );
    });

    return blocks.join("\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n");
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
    id,
  }: {
    type: string;
    fiat: string;
    amount: string;
    margin: number;
    method: string;
    id: string;
  }) =>
    `*${type} Bitcoin*\n\n` +
    `▪️ Monto: ${amount} ${fiat}\n` +
    `▪️ Tasa: ${margin === 0 ? "A precio de mercado" : `yadio.io ${margin > 0 ? "+" + margin : margin}%`}\n` +
    `▪️ Método: ${method}\n\n` +
    `¿Estás seguro de que deseas continuar?\n\n` +
    `ID: \`${id}\``,
  makerAskConfirm: ({
    type,
    fiat,
    amount,
    margin,
    method,
    trades,
    days,
    rating,
    id,
  }: {
    type: string;
    fiat: string;
    amount: string;
    margin: number;
    method: string;
    trades: number;
    days: number;
    rating: number;
    id: string;
  }) =>
    `Alguien quiere tomar tu orden de *${type}*.\n\n` +
    `▪️ Monto: ${amount} ${fiat}\n` +
    `▪️ Tasa: ${margin === 0 ? "A precio de mercado" : `yadio.io ${margin > 0 ? "+" + margin : margin}%`}\n` +
    `▪️ Método: ${method}\n\n` +
    `👤 **Datos de la contraparte:**\n` +
    `▪️ Operaciones: ${trades}\n` +
    `▪️ Antigüedad: ${days} días\n` +
    `▪️ Reputación: ${rating.toFixed(1)}/5.0\n\n` +
    `¿Deseas confirmar e iniciar el intercambio?\n\n` +
    `ID: \`${id}\``,
  promptExactAmount: (range: string, fiat: string) =>
    `Esta orden permite un rango de **${range} ${fiat}**.\n\n` +
    `💬 *Por favor, escribe en el chat el monto exacto* por el que deseas hacer el intercambio (solo números):`,
  askBuyerAddress: (estimatedSats: number) =>
    "📍 *Por favor, envía tu dirección de Bitcoin on-chain* donde recibirás los fondos.\n_(Asegúrate de que sea correcta, no nos hacemos responsables por errores de tipeo)_\n\n" +
    "La cantidad estimada a recibir es de: `" +
    estimatedSats / 100_000_000 +
    "` BTC (antes de comisiones de red).",
  waitMaker:
    "⏳ Perfecto. Por favor, *espera a que la contraparte confirme* si desea continuar con la orden.",
  waitTaker:
    "⏳ Dirección guardada. Ahora *espera a que el vendedor deposite* los fondos en la dirección multifirma.",
  acceptedNowWaitingEscrow: `✅ *Orden aceptada.*\n\n⏳ Esperando a que el vendedor envíe los fondos a la dirección multifirma, esto puede tomar varios minutos...`,

  // ─────────────────────────── Escrow & Network ───────────────────────────
  missingPubkeys:
    "❌ Error crítico: Faltan llaves públicas para generar la dirección multifirma.",
  askSellerEscrow: (sats: number, address: string) =>
    `⚡ *Fondeo de Bóveda Requerido*\n\n` +
    `Por favor, envía \`${sats / 100_000_000}\` BTC a la siguiente dirección multifirma on-chain:\n\n` +
    `\`${address}\`\n\n` +
    `_Una vez se confirme la transacción (2 confirmaciones), los pondremos en contacto. Por favor, asegúrate de enviar la cantidad EXACTA, de no ser así, podría requerir atención manual._`,
  escrowUnconfirmed: (escrowAddress: string) =>
    `⏳ *Transacción detectada en la red.*\n\n` +
    `[Ver en el explorador](${mempoolBaseURL}/address/${escrowAddress}) \n` +
    `_Esperando 2 confirmaciones para proceder de forma segura con la orden..._`,
  escrowFundingFailed: (
    utxoCount: number,
    totalFundedSats: number,
    expectedSats: number,
    orderId: string,
  ) =>
    `❌ *Fondeo fallido*\n\nSe han detectado ${utxoCount} depósitos pero el monto sigue siendo inferior al esperado (${totalFundedSats / 100_000_000} BTC recibidos de${expectedSats / 100_000_000} BTC requeridos). El límite máximo es de 2 transacciones.\n\nLa orden ha sido cancelada. Ejecuta \`/claim ${orderId}\` para solicitar el reembolso de los fondos parciales enviados.`,
  incompleteFunding: (
    totalFundedSats: number,
    expectedSats: number,
    remainingSats: number,
  ) =>
    `⚠️ *Depósito incompleto*\n\nHemos detectado la llegada de ${totalFundedSats / 100_000_000} BTC, pero la orden requiere${expectedSats / 100_000_000} BTC.\n\nFaltan por depositar: \`${remainingSats / 100_000_000}\` BTC.\n\n_Cuentas con 1 intento de envío adicional. Si el segundo depósito no completa la cantidad requerida, la orden se cancelará y pasará a reembolso._`,
  fundingExpired:
    "⚠️ Tu orden ha expirado por no completar el depósito a tiempo. Usa /claim para reembolsar los fondos parciales enviados a la dirección.",
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
    "❌ *Manipulación detectada*\n\nSe detectó una reversión parcial de los fondos en la red. La orden ha sido cancelada. Ejecuta /claim para recuperar el saldo restante.",
  orderCancelledDepositAltered:
    "❌ *Orden cancelada*\n\nEl depósito fue alterado en la red antes de confirmarse. El acuerdo ha sido abortado por tu seguridad.",
  escrowConfirmedBuyer: (sellerContact: string, orderId: string) =>
    `✅ *¡Depósito Confirmado!*\n\n` +
    `Los fondos están asegurados en la dirección multifirma.\n\n` +
    `🗣 **Contacta al vendedor aquí:** ${sellerContact}\n\n` +
    `_Instrucciones: Realiza el pago por el método acordado. Una vez transferido el dinero, ejecuta el comando_ \`/fiatsent ${orderId}\` _para notificar al vendedor._\n\n` +
    `💡 *Consejo de seguridad:* Usa /backup para guardar los datos técnicos de esta orden en caso de emergencia.`,

  escrowConfirmedSeller: (buyerContact: string, orderId: string) =>
    `✅ *¡Depósito Confirmado!*\n\n` +
    `Tus fondos están asegurados en la dirección multifirma.\n\n` +
    `🗣 **Contacta al comprador aquí:** ${buyerContact}\n\n` +
    `_Instrucciones: Espera el pago del comprador. Una vez que verifiques que el dinero está en tu cuenta, ejecuta el comando_ \`/release ${orderId}\` _para liberar los fondos._\n\n` +
    `💡 *Consejo de seguridad:* Usa /backup para guardar los datos técnicos de esta orden en caso de emergencia.`,
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
    "🤖 *Comisión del Protocolo*\n" +
    `   \`${botFee}%\`\n` +
    "   └ Se divide 50/50 entre ambas partes\n\n" +
    "💡 " +
    (customFee
      ? "Estás usando tu tarifa de red personalizada en lugar de la económica. Puedes actualizarla cuando quieras con /setfee."
      : "La tarifa económica es suficiente para que la transacción se confirme en las próximas horas sin pagar de más."),
  customFeeChanged: (newFee: number) =>
    `✅ La comisión de red ha sido establecida a ${newFee} sats/vB`,
  couldNotFetchFees:
    "❌ No se han podido conseguir las fees actuales, inténtalo de nuevo más tarde.",
  resetFeeButton: "♻️ Volver por defecto (Económica)",
  feeResetSuccess:
    "✅ Tu tarifa ha vuelto a la configuración económica por defecto.",
  errorProcessingTx: (err: string) => `❌ *Error en la red:*\n\`${err}\``,
  errorGeneratingPsbt: "❌ Error generando PSBT",
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
  askReleaseConfirmation: (buyerName: string) =>
    `⚠️ *Confirmación de Liberación*\n\n` +
    `Estás a punto de liberar los fondos en Bitcoin de la bóveda a favor de @**${buyerName}**.\n\n` +
    `🏦 *Antes de continuar, es estrictamente necesario que inicies sesión en tu cuenta bancaria o billetera y verifiques por ti mismo que el pago ha sido acreditado correctamente.*\n\n` +
    `_Recuerda que una vez liberados, los fondos en Bitcoin no podrán ser recuperados bajo ninguna circunstancia._\n\n` +
    `¿Deseas confirmar la liberación definitiva de los fondos?`,
  releaseSuccessSeller: (orderId: string) =>
    `✅ Has autorizado la liberación de la orden \`${orderId}\`.\n\n` +
    `El comprador ha sido notificado para que firme y reclame su Bitcoin. ¡Gracias por usar el servicio!`,
  releaseToBuyer: (orderId: string) =>
    `🎉 *¡El vendedor ha liberado los fondos!*\n\n` +
    `Los fondos están listos para ser reclamados. Ejecuta el siguiente comando para iniciar el retiro a tu billetera:\n\n` +
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

  // ─────────────────────────── Claim & Refund ───────────────────────────
  selectClaimableOrder:
    "👇 Selecciona la orden de la cual deseas reclamar los fondos:",
  noClaimableOrdersFound:
    "📭 No tienes órdenes listas para retirar o reembolsar.",
  showClaimPreview: (
    minerFee: number,
    finalAmount: number,
    receivingAddress: string,
    minerFeeRate: number,
  ) =>
    `🔐 *Reclamar Fondos*\n\n` +
    `**Desglose de la transacción:**\n` +
    `▪️ Dirección: \`${receivingAddress}\`\n` +
    `▪️ Comisión minera (est): \`-${minerFee / 100_000_000} BTC\` (${minerFeeRate} sats/vB)\n` +
    `▪️ **Recibirás aprox:** \`${finalAmount / 100_000_000} BTC\`\n\n` +
    `💡 *Nota:* Si no estás de acuerdo con la comisión minera, puedes enviar /exit para cancelar y usar /setfee para establecer tu propia tarifa.\n\n` +
    `Por favor, selecciona la forma en la que deseas firmar esta transacción:`,
  btnTypePassword: "✍️ Ingresar Contraseña",
  btnSignMiniapp: "🔐 Firmar en MiniApp",
  btnTxSubmitted: "✅ Ya transmití la transacción",
  psbtSigningLoading: `⏳ *Co-firmando y transmitiendo a la red...*`,
  transactionDetected: "✅ Transacción detectada en la red.",
  noExternalTxDetected: "⏳ Aún no detecto la transacción en la red. Si acabas de enviarla, espera unos segundos y vuelve a intentar.",
  successExternalSign: `✅ *Transacción Externa Completada*\n\nLos fondos han sido movidos exitosamente desde la MiniApp o una billetera externa. El contrato ha sido cerrado.`,
  fundsAlreadyMoved: "⚠️ *Fondos ya movidos*\n\nDetectamos que los fondos de este contrato ya fueron transferidos externamente en la red Bitcoin. El contrato ha sido cerrado.",
  claimSuccess: (txid: string) =>
    `🎉 *¡Retiro Exitoso!*\n\nLos fondos van camino a tu billetera.\n🔎 [Ver TX](${mempoolBaseURL}/tx/${txid})`,
  askRefundAddress: `📍 Por favor, envía la dirección de Bitcoin a la que deseas recibir tu reembolso:`,
  refundSuccess: (txid: string) =>
    `🎉 *¡Reembolso Exitoso!*\n\nTus fondos van de vuelta a tu billetera.\n🔎 [Ver TX](${mempoolBaseURL}/tx/${txid})`,
  refundCompletedNotification: (orderId: string) =>
    `ℹ️ *Orden Cancelada*\n\nEl vendedor reclamó el reembolso de la orden \`${orderId}\`. Los fondos fueron devueltos a su dirección original.`,

  // ─────────────────────────── Cancellations ───────────────────────────
  selectOrderToCancel:
    "👉 Selecciona la orden que quieres cancelar, puedes ver los detalles con /listorders",
  cancelNotAllowed: `❌ No puedes cancelar la orden en este estado. Si el pago ya fue enviado, deberás abrir una disputa.`,
  cancelUnconfirmed: `⏳ La orden tiene una transacción sin confirmar en la red. Debes esperar 2 confirmaciones antes de iniciar una cancelación.`,
  cancelAlreadyRequested: `⏳ Ya solicitaste la cancelación. Esperando a que tu contraparte acepte y firme.`,
  cancelOnlySeller: `❌ Solo el vendedor puede cancelar la orden en este estado.`,
  cancelAddressWait:
    "❌ Debes esperar al menos 10 minutos desde que se generó la dirección antes de cancelar, para prevenir problemas con transacciones en tránsito.",
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
  disputeNotAllowed: `❌ No puedes abrir una disputa en el estado actual de la orden. Las disputas solo aplican a órdenes con fondos activos en la dirección multifirma.`,
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
    escrowAddress: string;
    buyerUsername: string;
    sellerUsername: string;
    buyerCode: string;
    sellerCode: string;
  }) =>
    `⚖️ *NUEVA DISPUTA*\n\n` +
    `Orden: \`${orderId}\`\n` +
    `Tipo: ${type}\n` +
    `Monto: ${amountFiat} ${fiatCode}\n` +
    `Estado previo: \`${status}\`\n` +
    `Escrow: \`${escrowAddress}\`\n\n` +
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
    `⚖️ *Disputa resuelta.*\n\nLa orden \`${orderId}\` fue resuelta a favor del comprador. Los fondos serán liberados hacia su dirección.`,
  settleSellerWinsNotifySeller: (orderId: string) =>
    `⚖️ *Disputa resuelta a tu favor.*\n\nLa orden \`${orderId}\` fue resuelta a tu favor. Puedes recuperar tus fondos ejecutando:\n\n\`/claim ${orderId}\``,
  settleSellerWinsNotifyBuyer: (orderId: string) =>
    `⚖️ *Disputa resuelta.*\n\nLa orden \`${orderId}\` fue resuelta a favor del vendedor. Los fondos serán devueltos a su dueño original.`,
  settleCancelledNotifyBuyer: (orderId: string) =>
    `↩️ *Disputa resuelta: orden cancelada.*\n\nEl administrador determinó cancelar la orden \`${orderId}\`. Los fondos serán devueltos al vendedor.`,
  settleCancelledNotifySeller: (orderId: string) =>
    `↩️ *Disputa resuelta: orden cancelada.*\n\nEl administrador determinó cancelar la orden \`${orderId}\`. Los fondos podrán ser reembolsados usando el comando \`/claim ${orderId}\`.`,
  settleResolutionBuyerLabel: "A favor del comprador",
  settleResolutionSellerLabel: "A favor del vendedor",
  settleResolutionRefundLabel: "Cancelar / Reembolsar al vendedor",

  // ─────────────────────────── Errors & Validations ───────────────────────────
  noOrdersFound: "❌ No se han encontrado órdenes creadas por ti.",
  orderNotFound: `❌ Orden no encontrada.`,
  invalidOrderStatus: `❌ No puedes realizar esta acción en la etapa actual de la orden.`,
  waitForBuyerFiatSent: (orderId: string) =>
    "❌ Debes notificar al comprador que marque la orden como pagada con `/fiatsent " +
    orderId +
    "`",
  onlyBuyer: `❌ Solo el comprador puede realizar esta acción.`,
  onlySeller: `❌ Solo el vendedor puede autorizar esta acción.`,
  unauthorizedAccess: `❌ No tienes permisos sobre esta orden.`,
  invalidPassword: (retryCommand: string) =>
    `❌ Contraseña incorrecta. Por favor intenta de nuevo con \`${retryCommand}\``,
  invalidAmountRange: (min: number, max: number) =>
    `❌ El monto es inválido. Debe ser un número entre **${min}** y **${max}**.\nIntenta de nuevo:`,
  fiatValueBelowMinimun: (fiatCode: string, minValue: number) =>
    `❌ La cantidad para ${fiatCode} debe ser al menos${minValue}. Intenta de nuevo:`,
  fiatValueTooBig:
    "❌ El monto es demasiado grande para ser procesado por el sistema.",
  invalidRefundAddress:
    "❌ Esa dirección de Bitcoin no es válida. Por favor, envíala de nuevo:",
  invalidBuyerAddress:
    "❌ Esa dirección de Bitcoin no es válida. Por favor, envía una dirección correcta:",
  maxOrdersReached: "❌ Has alcanzado el límite de órdenes activas.",
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
    "❌ El valor debe ser igual o mayor a 0.8, menor a 20 y tener hasta 2 decimales.",

  // ─────────────────────────── Loans ───────────────────────────
  lendType: "🟢 Prestando",
  borrowType: "🔴 Pidiendo prestado",
  loanWizardPreview: (
    type: string,
    fiat: string,
    amount: string,
    apr: string,
    ltv: string,
    duration: string,
    method: string,
    prompt: string,
  ) =>
    `🏦 *Estructurando Préstamo (${type})*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `▪️ Capital: \`${amount} ${fiat}\`\n` +
    `▪️ Garantía (LTV): \`${ltv}\`\n` +
    `▪️ Tasa Anual (APR): \`${apr}\`\n` +
    `▪️ Plazo: \`${duration} mes(es)\`\n` +
    `▪️ Método de pago: \`${method}\`\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Para abortar el proceso escribe /exit_\n\n` +
    `👉 *${prompt}*`,
  channelLoanOffer: ({
    action,
    draft,
    user,
    loanId,
  }: {
    action: string;
    draft: LoanDraft;
    user: UserRecord;
    loanId: string;
  }) => {
    const daysUsing = Math.floor((Date.now() - user.createdAt) / 86400000);
    const hashtag = `#${draft.type}${draft.fiat}`;
    const method = escapeMarkdown(draft.paymentMethod || "");

    return (
      `**${action}**\n\n` +
      `Por ${draft.amount} ${draft.fiat} ${getFiatEmoji(draft.fiat!)}\n` +
      `💳 Método: ${method}\n` +
      `⏳ Plazo: ${draft.durationMonths} meses\n` +
      `📈 APR (Tasa Anual): ${draft.apr}%\n` +
      `🛡️ LTV (Garantía): ${draft.ltv}%\n\n` +
      `👤 **Contraparte:**\n` +
      `▪️ ${user.tradesCount} operaciones exitosas\n` +
      `▪️ Usa el bot hace ${daysUsing} días\n` +
      `▪️ ${user.rating.toFixed(1)} ${"⭐".repeat(Math.floor(user.rating))} (${user.ratingCount})\n\n` +
      `${hashtag}\n` +
      `\`${loanId}\``
    );
  },
  loanPublishedSuccess: (loanId: string) =>
    `✅ *Tu oferta de préstamo ha sido publicada en el canal.*\nTe notificaremos cuando alguien la tome.\n\nID: \`${loanId}\``,
  actionLend: "🟢 Ofrece prestar",
  actionBorrow: "🔴 Pidiendo prestado",
  btnTakeLoanBorrow: "Pedir prestado",
  btnTakeLoanLend: "Prestar",
  invalidLoanDuration:
    "❌ La duración debe ser un número entero (o rango, ej: 3-6) entre 1 y 120 meses. Intenta de nuevo:",
  invalidLoanDurationRange: (min: number, max: number) =>
    `❌ La duración debe estar entre ${min} y${max} meses. Intenta de nuevo:`,
  promptLoanLTV:
    "🛡️ Selecciona el Loan-to-Value (LTV) 👇\n_Define cuánto colateral se exige. Ej: Con un LTV del 50%, un préstamo de $1,000 requerirá bloquear $2,000 en Bitcoin como garantía._",
  promptLoanDuration: "Escribe la duración del contrato en **meses**:",
  promptLoanPaymentMethod:
    "Escribe el método para enviar/recibir el FIAT (Ej: Transferencia Bancaria, Zelle, etc.)",
  promptLoanAPR:
    "Escribe la Tasa de Interés Anual (APR) en porcentaje (Ej: 5, 8.5, 12):",

  invalidLoanAPR:
    "❌ El APR debe ser un número válido (mayor a 0 y menor a 100). Puedes usar decimales. Intenta de nuevo:",
  maxLoansReached:
    "❌ Has alcanzado el límite de anuncios de préstamos publicados.",

  cancelLoanForbidden:
    "❌ No puedes cancelar un préstamo una vez que el dinero FIAT ha sido enviado o el contrato está activo. Si hay un problema, debes abrir una disputa usando /dispute.",
  loanCancelOnlyBorrower:
    "❌ Solo el prestatario puede cancelar el préstamo en este estado.",

  loanTakerAskConfirm: ({
    type,
    fiat,
    amount,
    apr,
    ltv,
    duration,
    method,
    id,
  }: any) =>
    `*${type}*\n\n` +
    `▪️ Capital: ${amount} ${fiat} ${getFiatEmoji(fiat)}\n` +
    `▪️ Garantía (LTV): ${ltv}%\n` +
    `▪️ APR: ${apr}%\n` +
    `▪️ Plazo: ${duration} meses\n` +
    `▪️ Método: ${method}\n\n` +
    `¿Estás seguro de que deseas tomar esta oferta?\n\n` +
    `ID: \`${id}\``,
  loanTakerFinalConfirm: ({
    role,
    fiat,
    amount,
    apr,
    ltv,
    duration,
    method,
    id,
    totalReturn,
    estimatedCollateral,
  }: any) => {
    let text =
      `📋 *Resumen Final del Préstamo*\n\n` +
      `▪️ Capital: ${amount} ${fiat}\n` +
      `▪️ Plazo: ${duration} meses\n` +
      `▪️ Método: ${method}\n\n`;

    if (role === "LENDER") {
      text += `▪️ APR: ${apr}%\n`;
      text += `💰 **A cobrar al finalizar (Aprox):** ${totalReturn} ${fiat}\n`;
      text += `_(El prestatario depositará colateral en BTC para asegurar tu capital)_\n\n`;
    } else {
      text += `▪️ Garantía (LTV): ${ltv}%\n`;
      text += `▪️ Interés a pagar (APR): ${apr}%\n`;
      text += `💰 **Total a devolver:** ${totalReturn} ${fiat}\n`;
      text += `🔒 Colateral estimado a bloquear: ${estimatedCollateral} BTC\n\n`;
    }
    text += `¿Deseas confirmar los términos y notificar a la contraparte?\n\nID: \`${id}\``;
    return text;
  },

  loanMakerAskConfirm: ({
    role,
    fiat,
    amount,
    apr,
    ltv,
    duration,
    method,
    totalReturn,
    collateralSats,
    trades,
    days,
    rating,
    id,
  }: any) => {
    let text =
      `Alguien ha aceptado tu oferta de préstamo y ha definido los términos exactos:\n\n` +
      `▪️ Capital: ${amount} ${fiat}\n` +
      `▪️ Plazo: ${duration} meses\n` +
      `▪️ Método: ${method}\n\n`;

    if (role === "LENDER") {
      text += `▪️ APR: ${apr}%\n`;
      text += `💰 **A cobrar al finalizar (Aprox):** ${totalReturn} ${fiat}\n`;
      text += `_(El prestatario bloqueará ${collateralSats} BTC como garantía)_\n\n`;
    } else {
      text += `▪️ Garantía (LTV): ${ltv}%\n`;
      text += `▪️ Interés a pagar (APR): ${apr}%\n`;
      text += `💰 **Total a devolver:** ${totalReturn} ${fiat}\n`;
      text += `🔒 Colateral a bloquear: ${collateralSats} BTC\n\n`;
    }

    text +=
      `👤 **Datos de la contraparte:**\n` +
      `▪️ Operaciones: ${trades}\n` +
      `▪️ Antigüedad: ${days} días\n` +
      `▪️ Reputación: ${rating.toFixed(1)}/5.0\n\n` +
      `¿Deseas aceptar este contrato y avanzar al fondeo de la bóveda?\n\nID: \`${id}\``;
    return text;
  },
  promptLoanExactAmount: (range: string, fiat: string) =>
    `Esta oferta de préstamo permite un rango de capital de **${range} ${fiat}**.\n\n` +
    `💬 *Escribe en el chat el monto exacto* que deseas (solo números):`,
  promptLoanExactDuration: (range: string) =>
    `Esta oferta permite un plazo de entre **${range} meses**.\n\n` +
    `💬 *Escribe en el chat la cantidad exacta de meses* que deseas para este préstamo:`,
  waitLoanMaker:
    "⏳ Perfecto. *Espera a que el creador de la oferta confirme* si desea proceder con el préstamo.",
  askBorrowerEscrow: (sats: number, address: string) =>
    `⚡ *Bloqueo de Garantía (Colateral) Requerido*\n\n` +
    `Por favor, envía \`${sats / 100_000_000}\` BTC a la siguiente dirección de la bóveda multifirma:\n\n` +
    `\`${address}\`\n\n` +
    `_Una vez se confirme la transacción (2 confirmaciones), se le avisará al prestamista para que te envíe el FIAT. Asegúrate de enviar la cantidad EXACTA._`,

  waitBorrowerDeposit:
    "⏳ *Préstamo Aceptado.*\n\nAhora estamos esperando a que el prestatario deposite el Bitcoin de garantía en la bóveda multifirma. Te notificaremos cuando los fondos estén asegurados en la blockchain.",

  loanCollateralSecuredBorrower: (lenderContact: string, loanId: string) =>
    `✅ *¡Garantía bloqueada y confirmada!* (\`${loanId}\`)\n\n` +
    `Tu colateral en Bitcoin está asegurado en la bóveda multifirma.\n\n` +
    `🗣 **Contacta al prestamista aquí:** ${lenderContact}\n\n` +
    `_El prestamista ha sido notificado para que te envíe el capital en FIAT. Te enviaremos un mensaje cuando marque el desembolso como enviado._\n\n` +
    `💡 *Consejo de seguridad:* Usa /backup para guardar los datos técnicos de este contrato.`,

  loanCollateralSecuredLender: (
    borrowerContact: string,
    fiatAmount: number,
    fiatCode: string,
    loanId: string,
  ) =>
    `✅ *¡Garantía bloqueada y confirmada!*\n\n` +
    `El prestatario ha asegurado exitosamente su Bitcoin en la bóveda multifirma.\n\n` +
    `🗣 **Contacta al prestatario aquí:** ${borrowerContact}\n\n` +
    `**INSTRUCCIONES:**\n` +
    `Por favor, procede a desembolsar el capital acordado de **${fiatAmount} ${fiatCode}** al prestatario a través de su método de pago.\n\n` +
    `Una vez que le envíes el dinero, ejecuta este comando para iniciar el reloj del préstamo:\n` +
    `\`/fiatsent ${loanId}\`\n\n` +
    `💡 *Consejo de seguridad:* Usa /backup para guardar los datos técnicos de este contrato.`,
  loanFiatSentToLender: (loanId: string) =>
    `✅ Has marcado el desembolso del préstamo \`${loanId}\` como enviado.\n\n` +
    `El prestatario ha sido notificado para que revise su cuenta. El contrato pasará a estar **ACTIVO** y el tiempo comenzará a correr **únicamente** cuando confirme la recepción del dinero.\n\n` +
    `⏳ Si la contraparte no confirma el recibo en un plazo razonable, podrás abrir una disputa para que un administrador revise el caso.`,

  loanFiatSentToBorrower: (loanId: string, lenderName: string) =>
    `🔔 *¡El prestamista ha enviado el FIAT!*\n\n` +
    `@${lenderName} indica que ya ha transferido el capital a tu cuenta para el préstamo \`${loanId}\`.\n\n` +
    `Por favor, revisa tu cuenta bancaria o método de pago. Una vez verifiques que los fondos están disponibles, haz clic en el botón de confirmación 👇.\n\n` +
    `⚠️ El contrato no pasará a estado ACTIVO hasta que confirmes la recepción.\n\n` +
    `⚖️ *¿No has recibido el dinero?* Si ha pasado el tiempo de procesamiento habitual y los fondos no llegan, puedes ejecutar /dispute para abrir una disputa.`,
  noActiveLoansFound:
    "❌ No se han encontrado préstamos a los cuales puedas hacer pagos.",
  btnConfirmReceipt: "✅ Confirmar Recepción",
  promptRepayAmount: (
    baseAmount: number,
    totalInterest: number,
    amountRepaid: number,
    fiatCode: string,
    lenderUsername: string,
  ) => {
    const totalDebt = baseAmount + totalInterest;
    const remainingDebt = Math.max(0, totalDebt - amountRepaid);

    return (
      `📋 *Resumen de pago del Préstamo*\n\n` +
      `▪️ Capital prestado: \`${baseAmount.toFixed(2)} ${fiatCode}\`\n` +
      `▪️ Interés fijo (plazo completo): \`${totalInterest.toFixed(2)} ${fiatCode}\`\n` +
      `▪️ Deuda total: \`${totalDebt.toFixed(2)} ${fiatCode}\`\n` +
      `▪️ Monto ya pagado: \`${amountRepaid.toFixed(2)} ${fiatCode}\`\n` +
      `▪️ **Faltante por pagar:** \`${remainingDebt.toFixed(2)} ${fiatCode}\`\n\n` +
      `⚠️ *IMPORTANTE:* Debes realizar la transferencia de los fondos a tu contraparte **antes** de registrar el pago aquí.\n` +
      `🛑 Si aún no has transferido el dinero, ejecuta /exit para cancelar esta acción y comunícate con @${lenderUsername} para coordinar.\n\n` +
      `✅ Si ya transferiste la **totalidad del faltante** (\`${remainingDebt.toFixed(2)} ${fiatCode}\`), presiona el botón que aparece abajo.\n\n` +
      `🔢 **¿Realizaste un pago parcial?**\n` +
      `Escribe ahora mismo en este chat la cantidad exacta que ya le has transferido (solo números):`
    );
  },
  btnRepayFull: "✅ Pagué el monto total",
  receiptConfirmedBorrower: (loanId: string) =>
    `✅ *Recepción confirmada*\n\n` +
    `Has confirmado exitosamente la recepción de los fondos para el préstamo \`${loanId}\`.\n\n` +
    `El contrato está ahora **ACTIVO**. Por favor, asegúrate de cumplir con el repago en las fechas acordadas para recuperar tu colateral.\n\n` +
    `🔍 Puedes usar el comando /loanstatus en cualquier momento para revisar el estado, el tiempo restante y los detalles de tu préstamo.\n\n` +
    `💡 *Consejo:* Si lo necesitas, puedes comunicarte con el prestamista para realizar **pagos parciales** a lo largo del plazo; esto te ayudará a reducir tu deuda y evitar la liquidación de tu garantía.`,

  receiptConfirmedLender: (loanId: string) =>
    `✅ *El prestatario ha confirmado la recepción*\n\n` +
    `La contraparte acaba de confirmar que recibió el capital del préstamo \`${loanId}\` en su cuenta.\n\n` +
    `El contrato está oficialmente **ACTIVO** y el tiempo del plazo ha comenzado a correr desde este momento.\n\n` +
    `🔍 Puedes usar el comando /loanstatus en cualquier momento para monitorear el estado, el tiempo restante y los detalles de este préstamo.\n\n` +
    `💡 *Consejo:* Recuerda que puedes coordinar directamente con el prestatario para recibir **pagos parciales** durante la vigencia del contrato, en caso de que ambos lo consideren conveniente.`,
  selectRepaidLoan:
    "👇 Selecciona el préstamo para el cual has hecho un pago (ya sea parcial o completo):",

  paymentReported: (
    username: string,
    amount: number,
    fiat: string,
    loanId: string,
  ) =>
    `🔔 *Nuevo reporte de pago*\n\nEl prestatario @${username} indica que ha enviado un pago de *${amount} ${fiat}* para el préstamo \`${loanId}\`.\n\n¿Confirmas haber recibido este dinero en tu cuenta?`,
  btnConfirmPayment: "✅ Sí, recibí el pago",
  btnRejectPayment: "❌ No, rechazar",
  hasPendingPayment: "❌ Ya tienes un pago pendiente por confirmar.",
  paymentPendingConfirmation:
    "✅ Tu reporte de pago ha sido enviado al prestamista. Te notificaremos cuando lo confirme.",
  borrowerPaymentConfirmed: (amount: number, fiat: string) =>
    `✅ Tu pago de ${amount} ${fiat} fue confirmado por el prestamista.`,
  borrowerPaymentRejected: (amount: number, fiat: string) =>
    `❌ El prestamista ha denegado la recepción de tu pago de ${amount} ${fiat}.`,
  paymentConfirmedAction: (amount: number, fiat: string) =>
    `✅ Has confirmado la recepción de ${amount} ${fiat}.`,
  paymentRejectedAction: "❌ Has rechazado el pago.",
  paymentError: "❌ Error procesando el pago o este ya había sido procesado.",
  loanFullyRepaidLender: (loanId: string) =>
    `🎉 *¡Préstamo Pagado!*\n\nEl prestatario ha saldado por completo la deuda del préstamo \`${loanId}\`.\nEl contrato se ha cerrado exitosamente.`,

  loanFullyRepaidBorrower: (loanId: string) =>
    `🎉 *¡Préstamo Saldado!*\n\nHas pagado exitosamente el total del préstamo \`${loanId}\`.\n\nTu colateral en Bitcoin ya está listo para ser liberado. Ejecuta el siguiente comando para retirarlo a tu billetera:\n\n\`/claim ${loanId}\``,
  invalidCommandUsage: (format: string) =>
    `❌ Uso incorrecto del comando.\nFormato esperado: \`${format}\``,

  roleBorrower: "Prestatario (Recibes el dinero)",
  roleLender: "Prestamista (Prestas el dinero)",

  loanStatusMessage: (params: {
    id: string;
    role: string;
    status: string;
    apr: number;
    fiatCode: string;
    fPrincipal: string;
    fInterest: string;
    fTotal: string;
    fRepaid: string;
    fRemaining: string;
    fLtv: string;
    liquidationLtv: number;
    borrower: string;
    escrowAddress: string;
  }) => {
    return (
      `📊 *Préstamo:* \`${params.id}\`\n` +
      `👤 *Tu rol:* ${params.role}\n` +
      `📌 *Estado:* \`${params.status}\`\n\n` +
      `📈 *Riesgo (LTV):* *${params.fLtv}%* _(Se liquida al ${params.liquidationLtv}%)_\n\n` +
      `💰 *Deuda (${params.fiatCode}):*\n` +
      `▪️ Capital: ${params.fPrincipal}\n` +
      `▪️ Interés: ${params.fInterest} _(${params.apr}% total)_\n` +
      `▪️ Pagado: ${params.fRepaid}\n` +
      `▪️ *Restante:* *${params.fRemaining}*\n\n` +
      `💡 *¿Necesitas bajar tu LTV?*\n` +
      `1️⃣ *Añadir colateral:* Deposita BTC en \`${params.escrowAddress}\`. El LTV se actualizará automáticamente tras 2 confirmaciones.\n` +
      `2️⃣ *Pagar deuda:* Contacta a @${params.borrower} para acordar un pago parcial o total. Una vez hecho, usa el comando /repaid.`
    );
  },

  liquidationSuccess: (txid: string) =>
    `✅ *Liquidación Completada Exitosamente*\n\n` +
    `Has reclamado el colateral en Bitcoin debido al incumplimiento del prestatario.\n\n` +
    `🔗 [Ver transacción en el explorador](${mempoolBaseURL}/tx/${txid})`,

  ltvLiquidatedBorrower: (loanId: string) =>
    `📉 *Colateral Liquidado (Caída de Precio)*\n\n` +
    `El LTV de tu préstamo \`${loanId}\` superó el límite de riesgo del 90% debido a la caída del precio de Bitcoin.\n\n` +
    `El contrato ha pasado a estado de liquidación para proteger el capital del prestamista. Deberías reclamar el 5% sobrante usando /claim.`,

  ltvLiquidatedLender: (loanId: string) =>
    `✅ *Liquidación por LTV Disponible*\n\n` +
    `El LTV del préstamo \`${loanId}\` superó el límite crítico del 90%.\n\n` +
    `Puedes ejecutar el comando \`/claim ${loanId}\` para reclamar el 95% del colateral en Bitcoin (5% fee del protocolo) y asegurar tu inversión.`,

  loanExpiredBorrower: (loanId: string) =>
    `⚠️ *Tiempo Expirado - Préstamo Expirado*\n\n` +
    `El periodo de gracia de tu préstamo \`${loanId}\` ha expirado sin que se completaran los pagos correspondientes.\n\n` +
    `El prestamista ahora tiene derecho a cobrar su deuda. Si tu garantía superaba el valor de la deuda, podrás usar \`/claim ${loanId}\` posteriormente para retirar el excedente.`,

  loanExpiredLender: (loanId: string) =>
    `✅ *Deuda Recuperable Disponible*\n\n` +
    `El prestatario no pagó a tiempo el préstamo \`${loanId}\` y el periodo de gracia ha finalizado.\n\n` +
    `Puedes ejecutar el comando \`/claim ${loanId}\` para retirar el capital prestado junto con los intereses correspondientes de la garantía.`,

  ltvWarning: (currentLTV: number, liquidationThreshold: number) =>
    `⚠️ *Alerta de Riesgo de LTV*\n\n` +
    `El LTV de tu préstamo actual ha subido al *${currentLTV.toFixed(2)}%*.\n\n` +
    `Recuerda que si alcanza o supera el límite de *${liquidationThreshold}%*, tu préstamo pasará a estado de liquidación automática para proteger al prestamista. Te sugerimos agregar colateral o hacer un pago parcial. Ejecuta /loanstatus para saber cómo.`,

  settleBtnLoanRefund: "Reembolso (prestatario)",
  settleBtnLoanRelease: "Forzar liberación (prestatario)",
  settleBtnLoanLiquidation: "Forzar liquidación (prestamista)",
  settleBtnLoanActive: "Volver a Activo",
  settlePromptLoan: (
    loanId: string,
    lenderHandle: string,
    borrowerHandle: string,
  ) =>
    `⚖️ *Resolver disputa de Préstamo* \`${loanId}\`\n\n` +
    `👤 Prestatario: ${lenderHandle}\n` +
    `👤 Prestamista: ${borrowerHandle}\n\n` +
    `Selecciona una resolución:`,
  loanDisputeRefunded: (loanId: string) =>
    `✅ *Disputa resuelta (Reembolso)*\n\n` +
    `El administrador ha resuelto la disputa del préstamo \`${loanId}\` y ha autorizado el reembolso.\n\n` +
    `El colateral ya está disponible para que el prestatario lo retire íntegramente (sin comisión del bot). Usa el comando /claim para extraer los fondos.`,

  loanDisputeReleased: (loanId: string) =>
    `✅ *Disputa resuelta (Liberación Forzada)*\n\n` +
    `El administrador ha resuelto la disputa del préstamo \`${loanId}\` y ha forzado la liberación del colateral.\n\n` +
    `El colateral ya está disponible para que el prestatario lo retire (se deducirá la comisión del protocolo de la red). Usa el comando /claim para extraer los fondos.`,

  loanDisputeRestoredToActive: (loanId: string) =>
    `🔄 *Disputa cerrada (Préstamo activo nuevamente)*\n\n` +
    `El administrador ha cerrado la disputa del préstamo \`${loanId}\` y lo ha devuelto al estado *Activo*.\n\n` +
    `El préstamo continúa su curso normal. Por favor, mantengan la comunicación para finalizar el acuerdo.`,
  loanRepaymentAlreadyPending: (loanId: string) =>
    `⏳ *Pago pendiente de revisión*\n\n` +
    `Ya has reportado un pago para el préstamo \`${loanId}\` y está a la espera de confirmación.\n\n` +
    `Por favor, espera a que el prestamista revise y procese tu aviso actual antes de intentar reportar un nuevo pago.`,

  // ─────────────────────────── Backup ───────────────────────────
  backupPrivateOnly: "⚠️ Por tu seguridad, este comando solo funciona en chat privado conmigo.",
  backupMenuText: "🔐 *Centro de Respaldo*\n\n¿Qué información deseas exportar?",
  btnBackupUser: "👤 Respaldo de Usuario (Llaves)",
  btnBackupContract: "📜 Respaldo de Contrato (Multisig)",
  backupUserWarning: "🚨 *ZONA DE SEGURIDAD* 🚨\n\nEstás a punto de revelar tu llave privada encriptada. Asegúrate de estar en un lugar privado.\n\n_Nadie del equipo te pedirá estos datos nunca._",
  btnRevealKeys: "👁️ Sí, mostrar mis llaves",
  btnBack: "⬅️ Volver",
  btnCancel: "❌ Cancelar",
  backupUserKeys: (pubkey: string, encryptedWif: string) => `🔑 *Tus Credenciales de Respaldo*\n\n*Llave Pública:*\n\`${pubkey}\`\n\n*Llave Privada Encriptada (WIF):*\n||${encryptedWif}||\n\n_Toca el cuadro gris para revelar tu llave. Luego elimina este mensaje._`,
  noActiveContractsBackup: "No tienes contratos activos para respaldar.",
  backupContractsListText: "📜 *Respaldo de Contratos*\n\nSelecciona el contrato del cual quieres extraer la información técnica:",
  backupContractDetails: (id: string, escrowAddress: string, witnessScript: string) => `📜 *Respaldo del Contrato #${id}*\n\nEsta información técnica te permite interactuar con el contrato de forma manual y externa al bot en caso de emergencia.\n\n*Dirección Escrow:*\n\`${escrowAddress}\`\n\n*Witness Script (Hex):*\n\`${witnessScript}\`\n\n_Toca los recuadros para copiar. Guarda esto en un lugar seguro._`,
  btnBackToList: "⬅️ Volver a la lista",
};
