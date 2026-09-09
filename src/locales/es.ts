import type { orders } from "../db/schema.js";
import { mempoolBaseURL } from "../utils/network.js";

type OrderRow = typeof orders.$inferSelect;

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "⏳ Pendiente",
  WAITING_TAKER_CONFIRMATION: "⏳ Esperando confirmación",
  WAITING_MAKER_CONFIRMATION: "⏳ Esperando confirmación",
  WAITING_ESCROW: "📥 Esperando depósito",
  UNCONFIRMED: "🔄 Confirmando en la red",
  ACTIVE: "🟢 Activa",
  CANCEL_REQUESTED: "⚠️ Cancelación solicitada",
  FIAT_SENT: "💸 Fiat enviado",
  RELEASABLE: "🔓 Lista para liberar",
  REFUNDABLE: "↩️ Lista para reembolso",
  DISPUTE: "⚖️ En disputa",
  COMPLETED: "✅ Completada",
  REFUNDED: "↩️ Reembolsada",
  CANCELLED: "❌ Cancelada",
};

export default {
  welcome:
    "🤖 ¡aBitP2P te da la bienvenida!\n\n⚠️ *IMPORTANTE:* Antes de operar, configura tu contraseña segura con /setpass para completar la configuración de tu perfil.\n\nUsa /help para ver la lista de comandos completa. Recuerda unirte a nuestro chat general @aBitP2PGeneral\\_Es y suscribirte al canal de órdenes: @aBitP2PExchange ✨",
  telegramUsernameRequired:
    "❌ **Requiere nombre de usuario**\n\nNecesitas configurar un @username de Telegram para interactuar con este bot. Ve a *Ajustes > Nombre de usuario*, configúralo y vuelve a intentarlo.",
  cancelled: "❌ Proceso cancelado.",
  missingPubkeys:
    "❌ Error crítico: Faltan llaves públicas para generar el escrow.",
  btnBuyBitcoin: "Comprar Bitcoin",
  btnSellBitcoin: "Vender Bitcoin",
  orderPublishedSuccess: (orderId: string) =>
    "✅ *¡Orden publicada exitosamente en el canal!*\n" +
    "Puedes cancelarlo usando `/cancel " +
    orderId +
    "`",
  setYourPersonalPassword:
    "❌ Primero debes de establecer tu contraseña con /setpass para poder tomar o crear órdenes.",
  noOrdersFound: "❌ No se han encontrado ordenes creadas por ti.",
  marketPrice: "A precio de mercado",
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
    `/setlang — Cambia de idioma, ej: /setlang EN\n` +
    `/exit — Cancelar la acción actual\n\n` +
    `📢 Canal: @aBitP2PExchange\n` +
    `💬 Grupo: @aBitP2PGeneral\\_es`,
  listOrders: (list: OrderRow[]) => {
    if (list.length === 0) return "📭 No tienes órdenes registradas.";

    const blocks = list.map((o) => {
      const typeLabel = o.type === "SELL" ? "🔴 Venta" : "🟢 Compra";
      const statusLabel = ORDER_STATUS_LABELS[o.status] || o.status;
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

      const rows: [string, string][] = [
        ["Orden", o.id],
        ["Tipo", typeLabel],
        ["Fiat", o.fiatCode],
        ["Monto", `${o.amountFiat} ${o.fiatCode}`],
        ["Método", o.paymentMethod],
        ["Margen", marginLabel],
        ["Estado", statusLabel],
        ["Creada", createdDate],
      ];

      const maxLabel = Math.max(...rows.map(([label]) => label.length));
      const lines = rows.map(
        ([label, value]) => `${label.padEnd(maxLabel)} : ${value}`,
      );

      return "```\n" + lines.join("\n") + "\n```";
    });

    return blocks.join("\n\n");
  },

  buyType: "🟢 Compra",
  sellType: "🔴 Venta",

  actionBuy: "🟢 Comprando",
  actionSell: "🔴 Vendiendo",
  payDirectionBuy: "Pago por",
  payDirectionSell: "Recibo pago por",

  commandUsage: (usage: string) => `⚠️ *Uso:* \`${usage}\``,

  orderNotFound: `❌ Orden no encontrada.`,
  invalidOrderStatus: `❌ No puedes realizar esta acción en la etapa actual de la orden.`,
  waitForBuyerFiatSent: (orderId: string) =>
    "❌ Debes de notificar al comprador que marque la orden como pagada con `/fiatsent " +
    orderId +
    "`",
  onlyBuyer: `❌ Solo el comprador puede realizar esta acción.`,
  onlySeller: `❌ Solo el vendedor puede autorizar esta acción.`,
  invalidPassword: (retryCommand: string) =>
    `❌ Contraseña incorrecta. Por favor intenta de nuevo con \`${retryCommand}\``,

  promptFiat: "¿Qué moneda FIAT deseas usar? (Ej: USD, EUR, VES)",
  promptAmount: "Indica el monto o rango (Ej: 50-1000 o 100)",
  promptMargin: "Selecciona el margen en los botones de abajo 👇",
  promptPaymentMethod: "Escribe el método de pago (Ej: Zelle, Transferencia)",

  wizardPreview: (
    type: string,
    fiat: string,
    amount: string,
    margin: string,
    method: string,
    prompt: string,
  ) =>
    `🛠 *Creando Orden (${type})*\n\n` +
    "ℹ️ Puedes usar /exit para salir del proceso\n\n" +
    `💱 Moneda FIAT: \`${fiat}\`\n` +
    `📊 Monto / Rango: \`${amount}\`\n` +
    `📈 Margen: \`${margin}\`\n` +
    `💳 Método de pago: \`${method}\`\n\n` +
    `👉 *${prompt}*`,

  channelOrder: ({
    action,
    amountFiat,
    fiat,
    payDirection,
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
  }) =>
    `**${action} Bitcoin**\n\n` +
    `💵 Por ${amountFiat} ${fiat}\n` +
    `💳 ${payDirection} ${method}\n` +
    `🤝 Tiene ${tradesCount} operaciones exitosas\n` +
    `⏳ Usa el bot hace ${daysUsing} días\n\n` +
    `${hashtag}\n` +
    `📈 Tasa: ${margin === 0 ? "A precio de mercado" : `yadio.io ${margin > 0 ? "+" + margin : margin}%`}\n` +
    `${rating.toFixed(1)} ${"⭐".repeat(Number(rating.toFixed(0)))} (${tradesCount})\n\n` +
    `\`${id}\``,

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
    `*${type}* Bitcoin\n\n` +
    `💵 Monto: ${amount} ${fiat}\n` +
    `📈 Tasa: ${margin === 0 ? "A precio de mercado" : `yadio.io ${margin > 0 ? "+" + margin : margin}%`}\n` +
    `💳 Método: ${method}\n\n` +
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
    `💵 Monto: ${amount} ${fiat}\n` +
    `📈 Tasa: ${margin === 0 ? "A precio de mercado" : `yadio.io ${margin > 0 ? "+" + margin : margin}%`}\n` +
    `💳 Método: ${method}\n\n` +
    `👤 **Datos de la contraparte:**\n` +
    `🤝 Operaciones: ${trades}\n` +
    `⏳ Antigüedad: ${days} días\n` +
    `⭐ Reputación: ${rating.toFixed(1)}/5.0\n\n` +
    `¿Deseas confirmar e iniciar el intercambio?\n\n` +
    `ID: \`${id}\``,

  askBuyerAddress:
    "📍 *Por favor, envía tu dirección de Bitcoin on-chain* donde recibirás los fondos.\n_(Asegúrate de que sea correcta, no nos hacemos responsables por errores)_",
  promptExactAmount: (range: string, fiat: string) =>
    `Esta orden permite un rango de **${range} ${fiat}**.\n\n` +
    `💬 *Por favor, escribe en el chat el monto exacto* por el que deseas hacer el intercambio (solo números):`,

  invalidAmountRange: (min: number, max: number) =>
    `❌ El monto es inválido. Debe ser un número entre **${min}** y **${max}**.\nIntenta de nuevo:`,

  waitMaker:
    "⏳ Perfecto. Por favor, *espera a que la contraparte confirme* si desea continuar con la orden.",
  waitTaker:
    "⏳ Dirección guardada. Ahora *espera a que el vendedor deposite* los fondos en el escrow.",
  acceptedNowWaitingEscrow: `✅ *Orden aceptada.*\n\n⏳ Esperando a que el vendedor envíe los fondos al escrow, puede tomar varios minutos...`,

  askSellerEscrow: (sats: number, address: string) =>
    `⚡ *Fondeo de escrow Requerido*\n\n` +
    `Por favor, envía \`${sats / 100_000_000}\` BTC a la siguiente dirección on-chain:\n\n` +
    `\`${address}\`\n\n` +
    `_Una vez se confirme la transacción (1 conf), los pondremos en contacto. Por favor, asegurate de enviar la cantidad EXACTA, de no ser así, podría requerir atención manual._`,

  escrowUnconfirmed: (txid: string) =>
    `⏳ *Transacción detectada en la red.*\n\n` +
    `ID: \`${txid}\`\n` +
    `_Esperando 1 confirmación para notificar a la contraparte y activar el contrato..._`,

  escrowConfirmedBuyer: (sellerContact: string, orderId: string) =>
    `✅ *¡Escrow Fondeado y Confirmado!*\n\n` +
    `Los fondos están asegurados en el contrato inteligente.\n\n` +
    `🗣 **Contacta al vendedor aquí:** ${sellerContact}\n\n` +
    `_Instrucciones: Realiza el pago por el método acordado. Una vez transferido el dinero, ejecuta el comando_ \`/fiatsent ${orderId}\` _para notificar al vendedor._`,

  escrowConfirmedSeller: (buyerContact: string, orderId: string) =>
    `✅ *¡Escrow Fondeado y Confirmado!*\n\n` +
    `Tus fondos están asegurados en el contrato inteligente.\n\n` +
    `🗣 **Contacta al comprador aquí:** ${buyerContact}\n\n` +
    `_Instrucciones: Espera el pago del comprador. Una vez que verifiques que el dinero está en tu cuenta, ejecuta el comando_ \`/release ${orderId}\` _para liberar los fondos._`,

  releaseSuccessSeller: (orderId: string) =>
    `✅ Has autorizado la liberación de la orden \`${orderId}\`.\n\n` +
    `El comprador ha sido notificado para que firme y reclame su Bitcoin. ¡Gracias por usar el servicio!`,

  releaseToBuyer: (orderId: string) =>
    `🎉 *¡El vendedor ha liberado los fondos!*\n\n` +
    `El escrow está listo para ser reclamado. Ejecuta el siguiente comando para iniciar el retiro a tu billetera:\n\n` +
    `\`/claim ${orderId}\``,

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

  askClaimPassword: (
    minerFee: number,
    finalAmount: number,
    receivingAddress: string,
  ) =>
    `🔐 *Reclamar Fondos*\n\n` +
    `**Desglose de la transacción:**\n` +
    `├ Dirección: \`${receivingAddress}\`\n` +
    `├ Comisión minera (est): \`-${minerFee / 100_000_000} BTC\`\n` +
    `└ **Recibirás aprox:** \`${finalAmount / 100_000_000} BTC\`\n\n` +
    `Por favor, **escribe tu contraseña** para firmar criptográficamente el retiro hacia tu billetera:`,

  unauthorizedAccess: `❌ No tienes permisos sobre esta orden.`,

  cancelNotAllowed: `❌ No puedes cancelar la orden en este estado. Si el pago ya fue enviado, deberás abrir una disputa.`,
  cancelUnconfirmed: `⏳ La orden tiene una transacción sin confirmar en la red. Debes esperar 1 confirmación antes de iniciar una cancelación.`,
  cancelAlreadyRequested: `⏳ Ya solicitaste la cancelación. Esperando a que tu contraparte acepte y firme.`,
  cancelOnlySeller: `❌ Solo el vendedor puede cancelar la orden en este estado.`,

  psbtSigningLoading: `⏳ *Co-firmando y transmitiendo a la red...*`,
  fiatValueBelowMinimun: (fiatCode: string, minValue: number) =>
    `❌ La cantidad para ${fiatCode} debe ser al menos ${minValue}. Intenta de nuevo:`,

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

  invalidRefundAddress:
    "❌ Esa dirección de Bitcoin no es válida. Por favor, envíala de nuevo:",
  invalidBuyerAddress:
    "❌ Esa dirección de Bitcoin no es válida. Por favor, envía una dirección correcta:",

  refundSuccess: (txid: string) =>
    `🎉 *¡Reembolso Exitoso!*\n\nTus fondos van de vuelta a tu billetera.\n🔎 [Ver TX](${mempoolBaseURL}/tx/${txid})`,

  refundCompletedNotification: (orderId: string) =>
    `ℹ️ *Orden Cancelada*\n\nEl vendedor reclamó el reembolso de la orden \`${orderId}\`. Los fondos del escrow fueron devueltos.`,

  promptPassword:
    `` +
    `*⚠️ Se generará una llave privada ligada a tu usuario, la contraseña SERÁ NECESARIA para reclamar las órdenes.*\n` +
    `*NO SE PUEDE CAMBIAR, asegúrate de escribirla correctamente y anotarla en algún lugar.*\n\n` +
    "👀 El equipo de aBit no se hace responsable de la pérdida de esta.\n\n" +
    "🔑 Por favor, escribe tu contraseña para configurar tu usuario: ",
  passwordAlreadySet: "❌ Ya tienes una contraseña establecida previamente.",
  passwordSetSuccess: `✅ *Contraseña configurada con éxito.* Perfil encriptado y listo para usar.\n\n` + 
    "_Ten en centa que solo es para uso del bot. Los fondos que compres, se enviarán a cualquier dirección que desees al momento, el bot no custodia en ningún momento los fondos de manera directa._",
  cancelRequestSuccess: `✅ Has solicitado la cancelación. Esperando a que tu contraparte la apruebe con /cancel.`,
  askRefundAddress: `📍 Por favor, envía la dirección de Bitcoin a la que deseas recibir tu reembolso:`,
  btnYes: "✅ Sí, continuar",
  btnNo: "❌ No, cancelar",
  orderCancelled: "🚫 La orden ha sido cancelada o declinada.",
  claimSuccess: (txid: string) =>
    `🎉 *¡Retiro Exitoso!*\n\nLos fondos van camino a tu billetera.\n🔎 [Ver TX](${mempoolBaseURL}/tx/${txid})`,
  errorProcessingTx: (err: string) => `❌ *Error en la red:*\n\`${err}\``,

  // ─────────────────────────── Disputas ───────────────────────────

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

  invalidLanguage: '❌ Idioma inválido. Los idiomas disponibles son:\n\n',
  languageUpdateSuccess: '✅ Idioma actualizado correctamente.'
};
