import type { orders } from "../db/schema.js";
import {
  Strings,
  OrderStatusLabelsES,
  getFiatEmoji,
} from "../shared/constants.js";
import { mempoolBaseURL, type MempoolFeesData } from "../core/bitcoin/index.js";

type OrderRow = typeof orders.$inferSelect;

export default {
  // ─────────────────────────── Geral e UI ───────────────────────────
  helpMessage: () =>
    `🤖 *aBitP2P — Central de Ajuda*\n\n` +
    `🛒 *Mercado*\n` +
    `/buy — Comprar Bitcoin\n` +
    `/sell — Vender Bitcoin\n` +
    `/listorders — Ver suas ordens ativas\n\n` +
    `⚡️ *Gerenciamento de Ordens* (adicione o ID)\n` +
    `/fiatsent — Notificar pagamento enviado\n` +
    `/release — Liberar fundos para o comprador\n` +
    `/claim — Solicitar fundos ou reembolso\n` +
    `/cancel — Cancelar uma ordem\n` +
    `/dispute — Abrir uma disputa com a moderação\n` +
    `_Ex.: /release ab12cd-34ef56_\n\n` +
    `⚙️ *Conta e Sistema*\n` +
    `/setpass — Criptografar seu perfil usando uma senha\n` +
    `/setlang — Alterar idioma\n` +
    "/fees - Verificar as taxas das suas ordens \n" +
    `/exit — Cancelar a ação atual\n\n` +
    `📢 Canal: ${Strings.ORDER_CHANNEL_TAG}\n` +
    `💬 Grupo: ${Strings.GENERAL_CHAT_TAG}`,
  commandUsage: (usage: string) => `⚠️ *Uso:* \`${usage}\``,
  cancelled: "❌ Processo cancelado.",
  btnYes: "✅ Sim, continuar",
  btnNo: "❌ Não, cancelar",
  btnBuyBitcoin: "Comprar Bitcoin",
  btnSellBitcoin: "Vender Bitcoin",
  actionBuy: "🟢 Comprando",
  actionSell: "🔴 Vendendo",
  buyType: "🟢 Compra",
  sellType: "🔴 Venda",
  payDirectionBuy: "Pago por",
  payDirectionSell: "Recebo pagamento por",
  marketPrice: "Preço de mercado",

  // ─────────────────────────── Configuração e Perfil ───────────────────────────
  telegramUsernameRequired:
    "❌ **Nome de usuário obrigatório**\n\nVocê precisa configurar um @username do Telegram para interagir com este bot. Acesse *Configurações > Nome de usuário*, configure-o e tente novamente.",
  setYourPersonalPassword:
    "❌ Primeiro, você precisa definir sua senha usando /setpass para poder aceitar ou criar ordens.",
  promptPassword:
    `*⚠️ Será criada uma chave privada vinculada ao seu usuário, e a senha SERÁ NECESSÁRIA para reivindicar as ordens.*\n` +
    `*NÃO É POSSÍVEL ALTERÁ-LA. Certifique-se de digitá-la corretamente e anote-a em um local seguro.*\n\n` +
    "🔑 *Digite sua senha para configurar seu usuário:*",
  confirmPassword: "👉 Para confirmar, digite a senha novamente: ",
  passwordsDoNotMatch:
    "❌ As senhas não coincidem. Tente novamente com /setpass",
  passwordAlreadySet: "❌ Você já possui uma senha definida.",
  passwordSetSuccess:
    `✅ *Senha configurada com sucesso.* Perfil criptografado e pronto para uso.\n\n` +
    "_Lembre-se de que ela serve apenas para o uso do bot. Os fundos que você comprar serão enviados para qualquer endereço que desejar no momento da operação. O bot nunca mantém a custódia direta dos seus fundos._",
  invalidLanguage: "❌ Idioma inválido.",
  selectLanguage: "👇 Selecione seu idioma preferido",
  languageUpdateSuccess: "✅ Idioma atualizado com sucesso.",

  // ─────────────────────────── Mercado e Criação de Ordens ───────────────────────────
  promptFiat: "Qual moeda FIAT você deseja usar? (Ex.: USD, EUR, BRL)",
  promptAmount: "Informe o valor ou intervalo (ex.: 500-1000 ou 100)",
  promptMargin: "Selecione a margem nos botões abaixo 👇",
  promptPaymentMethod: "Digite o método de pagamento (ex.: Pix, transferência)",
  invalidAmountAfterMargin:
    ({
      margin,
      satsAmount,
      minFiatRequired,
      fiatCode,
    }: {
      margin: number,
      satsAmount: number,
      minFiatRequired: number,
      fiatCode: string
    }) => `⚠️ *Valor insuficiente após aplicar a margem*\n\n` +
    `Após aplicar sua margem de ${margin}%, o total a receber caiu para ${satsAmount.toLocaleString()} sats.\n\n` +
    `Para cumprir o mínimo de 60.000 sats, você precisa iniciar a ordem com pelo menos *$${minFiatRequired.toFixed(2)} ${fiatCode}*.\n\n` +
    `🔄 Inicie novamente a criação da ordem.`,
  wizardPreview: (
    type: string,
    fiat: string,
    amount: string,
    margin: string,
    method: string,
    prompt: string,
  ) =>
    `🛠 *Criando Ordem (${type})*\n\n` +
    "ℹ️ Você pode usar /exit para sair do processo\n\n" +
    `💱 Moeda FIAT: \`${fiat}\`\n` +
    `📊 Valor / Intervalo: \`${amount}\`\n` +
    `📈 Margem: \`${margin}\`\n` +
    `💳 Método de pagamento: \`${method}\`\n\n` +
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
    `Por ${amountFiat} ${fiat} ${getFiatEmoji(fiat)}\n ` +
    `💳 ${payDirection} ${method}\n` +
    `🤝 Possui ${tradesCount} operações concluídas com sucesso\n` +
    `⏳ Usa o bot há ${daysUsing} dias\n\n` +
    `${hashtag}\n` +
    `📈 Taxa: ${margin === 0 ? "Preço de mercado" : `yadio.io ${margin > 0 ? "+" + margin : margin}%`}\n` +
    `${rating.toFixed(1)} ${"⭐".repeat(Math.floor(rating))} (${ratingCount})\n\n` +
    `\`${id}\``,
  orderPublishedSuccess: (orderId: string) =>
    "✅ *Ordem publicada com sucesso no canal!*\n" +
    "Você pode cancelá-la usando `/cancel " +
    orderId +
    "`\n" +
    "👉 " +
    Strings.ORDER_CHANNEL_TAG,
  listOrders: (list: OrderRow[]) => {
    if (list.length === 0) return "📭 Você não possui ordens registradas.";

    const blocks = list.map((o) => {
      const typeLabel = o.type === "SELL" ? "🔴 Venda" : "🟢 Compra";
      const statusLabel = OrderStatusLabelsES[o.status] || o.status;
      const marginLabel =
        o.margin === 0
          ? "Preço de mercado"
          : `${o.margin > 0 ? "+" : ""}${o.margin}%`;
      const createdDate = new Date(o.createdAt).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      return [
        `📄 Ordem: \`${o.id}\``,
        `Tipo: \`${typeLabel}\``,
        `Fiat: \`${o.fiatCode}\``,
        `Valor: \`${o.fiatAmountLocked ?? o.amountFiat} ${o.fiatCode}\``,
        `Método: \`${o.paymentMethod}\``,
        `Margem: \`${marginLabel}\``,
        `Status: \`${statusLabel}\``,
        `Criada em: \`${createdDate}\``,
      ].join("\n");
    });

    return blocks.join(
      "\n\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n\n",
    );
  },

  // ─────────────────────────── Matching e Confirmações ───────────────────────────
  orderTaken: "⚠️ Esta ordem já foi aceita por outra pessoa.",
  cantTakeOwnOrder: "❌ Você não pode aceitar sua própria ordem.",
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
    `💵 Valor: ${amount} ${fiat}\n` +
    `📈 Taxa: ${margin === 0 ? "Preço de mercado" : `yadio.io ${margin > 0 ? "+" + margin : margin}%`}\n` +
    `💳 Método: ${method}\n\n` +
    `Tem certeza de que deseja continuar?\n\n` +
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
    `Alguém deseja aceitar sua ordem de *${type}*.\n\n` +
    `💵 Valor: ${amount} ${fiat}\n` +
    `📈 Taxa: ${margin === 0 ? "Preço de mercado" : `yadio.io ${margin > 0 ? "+" + margin : margin}%`}\n` +
    `💳 Método: ${method}\n\n` +
    `👤 **Dados da contraparte:**\n` +
    `🤝 Operações: ${trades}\n` +
    `⏳ Tempo de uso: ${days} dias\n` +
    `⭐ Reputação: ${rating.toFixed(1)}/5.0\n\n` +
    `Deseja confirmar e iniciar a negociação?\n\n` +
    `ID: \`${id}\``,
  promptExactAmount: (range: string, fiat: string) =>
    `Esta ordem permite um intervalo de **${range} ${fiat}**.\n\n` +
    `💬 *Digite no chat o valor exato com o qual deseja realizar a negociação (somente números):*`,
  askBuyerAddress: (estimatedSats: number) =>
    "📍 *Envie o endereço on-chain de Bitcoin* onde você receberá os fundos.\n_(Certifique-se de que ele está correto. Não nos responsabilizamos por erros.)_\n\n" +
    "O valor estimado a receber é de: `" +
    estimatedSats / 100_000_000 +
    "` BTC antes das taxas da rede.",
  waitMaker:
    "⏳ Perfeito. *Aguarde a confirmação da contraparte* para continuar com a ordem.",
  waitTaker:
    "⏳ Endereço salvo. Agora *aguarde o vendedor depositar os fundos no escrow*.",
  acceptedNowWaitingEscrow: `✅ *Ordem aceita.*\n\n⏳ Aguardando o vendedor enviar os fundos para o escrow. Isso pode levar alguns minutos...`,

  // ─────────────────────────── Escrow e Rede ───────────────────────────
  missingPubkeys:
    "❌ Erro crítico: faltam chaves públicas para gerar o escrow.",
  askSellerEscrow: (sats: number, address: string) =>
    `⚡ *Financiamento do escrow necessário*\n\n` +
    `Envie \`${sats / 100_000_000}\` BTC para o seguinte endereço on-chain:\n\n` +
    `\`${address}\`\n\n` +
    `_Assim que a transação for confirmada (1 confirmação), colocaremos vocês em contato. Envie o valor EXATO; caso contrário, poderá ser necessária uma intervenção manual._`,
  escrowUnconfirmed: (txid: string) =>
    `⏳ *Transação detectada na rede.*\n\n` +
    `ID: \`${txid}\`\n` +
    `[Ver no explorador](${mempoolBaseURL}/tx/${txid}) \n` +
    `_Aguardando 1 confirmação para prosseguir com segurança com a ordem..._`,
  escrowConfirmedBuyer: (sellerContact: string, orderId: string) =>
    `✅ *Escrow financiado e confirmado!*\n\n` +
    `Os fundos estão protegidos no contrato inteligente.\n\n` +
    `🗣 **Entre em contato com o vendedor aqui:** ${sellerContact}\n\n` +
    `_Instruções: realize o pagamento pelo método combinado. Depois de enviar o dinheiro, execute o comando_ \`/fiatsent ${orderId}\` _para notificar o vendedor._`,
  escrowConfirmedSeller: (buyerContact: string, orderId: string) =>
    `✅ *Escrow financiado e confirmado!*\n\n` +
    `Seus fundos estão protegidos no contrato inteligente.\n\n` +
    `🗣 **Entre em contato com o comprador aqui:** ${buyerContact}\n\n` +
    `_Instruções: aguarde o pagamento do comprador. Depois de confirmar que o dinheiro está na sua conta, execute o comando_ \`/release ${orderId}\` _para liberar os fundos._`,
  feesList: (botFee: string, feesData: MempoolFeesData) =>
    "⚡ *Taxas da Rede (Mempool)*\n\n" +
    "┌ ▸ Rápida 🚀\n" +
    `│   \`${feesData.fastestFee}\` sat/vB\n` +
    "├ ▸ Média ⚡\n" +
    `│   \`${feesData.halfHourFee}\` sat/vB\n` +
    "├ ▸ Lenta 🐢\n" +
    `│   \`${feesData.hourFee}\` sat/vB\n` +
    "└ ▸ *Econômica* ✅ *(usada pelo bot)*\n" +
    `    \`${feesData.economyFee}\` sat/vB\n\n` +
    "━━━━━━━━━━━━━━━━━━━━\n\n" +
    "🤖 *Taxa do Bot*\n" +
    `   \`${botFee}%\`\n` +
    "   └ Dividida igualmente entre as duas partes\n\n" +
    "💡 A taxa econômica é suficiente para " +
    "que a transação seja confirmada nas próximas horas sem pagar mais do que o necessário.",
  couldNotFetchFees:
    "❌ Não foi possível obter as taxas atuais. Tente novamente mais tarde.",
  errorProcessingTx: (err: string) => `❌ *Erro na rede:*\n\`${err}\``,

  // ─────────────────────────── FIAT e Liberação ───────────────────────────
  fiatSentToBuyer: (orderId: string) =>
    `✅ Você marcou a ordem \`${orderId}\` como paga.\n\n` +
    `O vendedor foi notificado. Aguarde até que ele confirme o recebimento na conta e libere os fundos.`,
  fiatSentToSeller: (orderId: string, buyerName: string) =>
    `🔔 *Pagamento informado pelo comprador!*\n\n` +
    `${buyerName} informou que já enviou o pagamento FIAT para sua conta.\n\n` +
    `**INSTRUÇÕES:**\n` +
    `1. Verifique sua conta bancária ou o método de pagamento combinado.\n` +
    `2. Confirme se o valor está correto.\n` +
    `3. Se estiver tudo certo, libere os Bitcoins executando:\n\n` +
    `\`/release ${orderId}\``,
  releaseSuccessSeller: (orderId: string) =>
    `✅ Você autorizou a liberação da ordem \`${orderId}\`.\n\n` +
    `O comprador foi notificado para assinar e reivindicar seus Bitcoins. Obrigado por usar o serviço!`,
  releaseToBuyer: (orderId: string) =>
    `🎉 *O vendedor liberou os fundos!*\n\n` +
    `O escrow está pronto para ser reivindicado. Execute o comando abaixo para iniciar o saque para sua carteira:\n\n` +
    `\`/claim ${orderId}\``,

  // --------------------------- Avaliação -----------------------------------
  rateCounterpartyMessage: "👉 Avalie sua contraparte:",
  ratingDone: (stars: number) =>
    `⭐ Você avaliou sua contraparte com ${stars} estrelas.`,

  // ─────────────────────────── Claim e Reembolso ───────────────────────────
  askClaimPassword: (
    minerFee: number,
    finalAmount: number,
    receivingAddress: string,
  ) =>
    `🔐 *Reivindicar Fundos*\n\n` +
    `**Detalhamento da transação:**\n` +
    `├ Endereço: \`${receivingAddress}\`\n` +
    `├ Taxa de mineração (est.): \`-${minerFee / 100_000_000} BTC\`\n` +
    `└ **Você receberá aproximadamente:** \`${finalAmount / 100_000_000} BTC\`\n\n` +
    `Digite sua **senha** para assinar criptograficamente o saque para sua carteira:`,
  psbtSigningLoading: `⏳ *Coassinando e transmitindo para a rede...*`,
  claimSuccess: (txid: string) =>
    `🎉 *Saque realizado com sucesso!*\n\nOs fundos estão a caminho da sua carteira.\n🔎 [Ver TX](${mempoolBaseURL}/tx/${txid})`,
  askRefundAddress: `📍 Envie o endereço de Bitcoin para o qual deseja receber seu reembolso:`,
  refundSuccess: (txid: string) =>
    `🎉 *Reembolso realizado com sucesso!*\n\nSeus fundos estão voltando para sua carteira.\n🔎 [Ver TX](${mempoolBaseURL}/tx/${txid})`,
  refundCompletedNotification: (orderId: string) =>
    `ℹ️ *Ordem cancelada*\n\nO vendedor reivindicou o reembolso da ordem \`${orderId}\`. Os fundos do escrow foram devolvidos.`,

  // ─────────────────────────── Cancelamentos ───────────────────────────
  selectOrderToCancel:
    "👉 Selecione a ordem que deseja cancelar. Você pode ver os detalhes usando /listorders",
  cancelNotAllowed: `❌ Você não pode cancelar a ordem neste status. Se o pagamento já foi enviado, deverá abrir uma disputa.`,
  cancelUnconfirmed: `⏳ A ordem possui uma transação não confirmada na rede. Você precisa aguardar 1 confirmação antes de iniciar um cancelamento.`,
  cancelAlreadyRequested: `⏳ Você já solicitou o cancelamento. Aguardando que sua contraparte aceite e assine.`,
  cancelOnlySeller: `❌ Somente o vendedor pode cancelar a ordem neste status.`,
  counterpartyCanceledDeleted: (orderId: string) =>
    `🚫 Sua contraparte cancelou a ordem \`${orderId}\`.`,
  matchCancelledRepublished: (orderId: string) =>
    `🚫 Sua contraparte cancelou o acordo da ordem \`${orderId}\`.\n\nA ordem foi publicada novamente no canal para que outro usuário possa aceitá-la.`,
  cancelNotifiedCounterparty: (orderId: string) =>
    `🔔 *Solicitação de cancelamento*\n\nSua contraparte solicitou o cancelamento da ordem \`${orderId}\`. Se você concordar, execute \`/cancel ${orderId}\` para confirmar e reembolsar os fundos ao vendedor.\n\n` +
    `⚠️ Se você já realizou o pagamento, abra uma disputa; não aceite o cancelamento: \`/dispute ${orderId}\``,
  cancelAccepted: (orderId: string) =>
    `✅ *Cancelamento confirmado.*\n\nA ordem \`${orderId}\` foi cancelada por acordo mútuo. Os fundos serão reembolsados ao vendedor.`,
  cancelAcceptedSeller: (orderId: string) =>
    `✅ *Cancelamento confirmado.*\n\nA ordem \`${orderId}\` foi cancelada por acordo mútuo. Você pode reivindicar o reembolso dos seus fundos executando:\n\n\`/claim ${orderId}\``,
  cancelRequestSuccess: `✅ Você solicitou o cancelamento. Aguarde sua contraparte aprová-lo usando /cancel.`,
  orderCancelled: "🚫 A ordem foi cancelada.",

  // ─────────────────────────── Disputas ───────────────────────────
  disputeNotAllowed: `❌ Você não pode abrir uma disputa no status atual da ordem. As disputas só se aplicam a ordens com fundos ativos no escrow.`,
  disputeAlreadyOpen: `⚠️ Já existe uma disputa aberta para esta ordem.`,
  disputeOpened: (code: string, orderId: string) =>
    `⚖️ *Sua disputa foi aberta.*\n\n` +
    `Ordem: \`${orderId}\`\n\n` +
    `Seu código de verificação é: \`${code}\`\n\n` +
    `Este código serve *exclusivamente* para verificar a identidade do administrador responsável pela sua disputa.\n\n` +
    `⚠️ *IMPORTANTE:* nenhum administrador entrará em contato com você antes que o bot notifique oficialmente quem assumiu sua disputa. Se alguém afirmar ser administrador antes dessa notificação, não continue a conversa.`,
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
    `⚖️ *NOVA DISPUTA*\n\n` +
    `Ordem: \`${orderId}\`\n` +
    `Tipo: ${type}\n` +
    `Valor: ${amountFiat} ${fiatCode}\n` +
    `Status anterior: \`${status}\`\n` +
    `Escrow: \`${escrowAddress}\`\n\n` +
    `👤 Comprador: @${buyerUsername}\n` +
    `👤 Vendedor: @${sellerUsername}\n\n` +
    `🔑 Código de verificação do comprador: \`${buyerCode}\`\n` +
    `🔑 Código de verificação do vendedor: \`${sellerCode}\`\n\n` +
    `Para assumir esta disputa, execute:\n\`/takedispute ${orderId}\``,
  disputeNotFoundOrNotOpen: `❌ Esta ordem não existe ou não está atualmente em disputa.`,
  disputeAlreadyTaken: `⚠️ Esta disputa já foi assumida por outro administrador.`,
  disputeTakenSuccessAdmin: (orderId: string) =>
    `✅ Você assumiu a disputa da ordem \`${orderId}\`. Ambas as partes foram notificadas.\n\nQuando tiver uma decisão, execute:\n\`/settle ${orderId}\``,
  disputeTakenNotification: (
    adminHandle: string,
    code: string,
    orderId: string,
  ) =>
    `⚖️ *Disputa atribuída*\n\n` +
    `A disputa da ordem \`${orderId}\` foi assumida por *${adminHandle}*.\n\n` +
    `Seu código de verificação: \`${code}\`\n\n` +
    `⚠️ Nenhum administrador entrou em contato com você antes desta mensagem. Antes de compartilhar qualquer informação:\n` +
    `1️⃣ Verifique se o username corresponde ao exibido nesta mensagem.\n` +
    `2️⃣ Peça que ele informe seu código de verificação.\n` +
    `3️⃣ O código deve corresponder exatamente ao código acima.\n\n` +
    `O código, por si só, não concede nenhuma permissão ao administrador nem altera sua disputa.`,
  disputeTakenNotificationNoCode: (adminHandle: string, orderId: string) =>
    `⚖️ *Disputa atribuída*\n\n` +
    `A disputa da ordem \`${orderId}\` foi assumida por *${adminHandle}*.\n\n` +
    `⚠️ Nenhum administrador entrou em contato com você antes desta mensagem. Verifique se o username corresponde exatamente ao exibido acima antes de compartilhar qualquer informação com essa pessoa.`,
  adminOnlyAction: `❌ Somente um administrador autorizado pode executar esta ação.`,
  settleNotFoundOrNotInDispute: `❌ Esta ordem não existe ou não está em disputa.`,
  settleNotAssignedAdmin: `❌ Somente o administrador atribuído a esta disputa pode resolvê-la.`,
  settleStaleAction: `⚠️ Esta disputa já foi resolvida. Este botão não é mais válido.`,
  settlePrompt: (orderId: string, buyerHandle: string, sellerHandle: string) =>
    `⚖️ *Resolver disputa* \`${orderId}\`\n\n` +
    `👤 Comprador: ${buyerHandle}\n` +
    `👤 Vendedor: ${sellerHandle}\n\n` +
    `Selecione uma decisão:`,
  settleBtnBuyer: (buyerHandle: string) =>
    `✅ A favor do comprador (${buyerHandle})`,
  settleBtnSeller: (sellerHandle: string) =>
    `✅ A favor do vendedor (${sellerHandle})`,
  settleBtnRefund: `↩️ Cancelar ordem / Reembolsar vendedor`,
  settleResolvedAdmin: (orderId: string, resolution: string) =>
    `✅ Disputa \`${orderId}\` resolvida: *${resolution}*.\n\nAmbas as partes foram notificadas.`,
  settleBuyerWinsNotifyBuyer: (orderId: string) =>
    `⚖️ *Disputa resolvida a seu favor.*\n\nA ordem \`${orderId}\` foi resolvida a favor do comprador. Você já pode reivindicar seus fundos executando:\n\n\`/claim ${orderId}\``,
  settleBuyerWinsNotifySeller: (orderId: string) =>
    `⚖️ *Disputa resolvida.*\n\nA ordem \`${orderId}\` foi resolvida a favor do comprador. Os fundos do escrow serão liberados para o endereço dele.`,
  settleSellerWinsNotifySeller: (orderId: string) =>
    `⚖️ *Disputa resolvida a seu favor.*\n\nA ordem \`${orderId}\` foi resolvida a favor do vendedor. Você pode recuperar seus fundos executando:\n\n\`/claim ${orderId}\``,
  settleSellerWinsNotifyBuyer: (orderId: string) =>
    `⚖️ *Disputa resolvida.*\n\nA ordem \`${orderId}\` foi resolvida a favor do vendedor. Os fundos do escrow serão devolvidos ao proprietário original.`,
  settleCancelledNotifyBuyer: (orderId: string) =>
    `↩️ *Disputa resolvida: ordem cancelada.*\n\nO administrador determinou o cancelamento da ordem \`${orderId}\`. Os fundos serão devolvidos ao vendedor.`,
  settleCancelledNotifySeller: (orderId: string) =>
    `↩️ *Disputa resolvida: ordem cancelada.*\n\nO administrador determinou o cancelamento da ordem \`${orderId}\`. Os fundos poderão ser reembolsados usando o comando \`/claim ${orderId}\`.`,
  settleResolutionBuyerLabel: "A favor do comprador",
  settleResolutionSellerLabel: "A favor do vendedor",
  settleResolutionRefundLabel: "Cancelar / Reembolsar o vendedor",

  // ─────────────────────────── Erros e Validações ───────────────────────────
  noOrdersFound: "❌ Nenhuma ordem criada por você foi encontrada.",
  orderNotFound: `❌ Ordem não encontrada.`,
  invalidOrderStatus: `❌ Você não pode realizar esta ação na etapa atual da ordem.`,
  waitForBuyerFiatSent: (orderId: string) =>
    "❌ Você precisa pedir ao comprador para marcar a ordem como paga usando `/fiatsent " +
    orderId +
    "`",
  onlyBuyer: `❌ Somente o comprador pode realizar esta ação.`,
  onlySeller: `❌ Somente o vendedor pode autorizar esta ação.`,
  unauthorizedAccess: `❌ Você não tem permissões para esta ordem.`,
  invalidPassword: (retryCommand: string) =>
    `❌ Senha incorreta. Tente novamente usando \`${retryCommand}\``,
  invalidAmountRange: (min: number, max: number) =>
    `❌ O valor é inválido. Deve ser um número entre **${min}** e **${max}**.\nTente novamente:`,
  fiatValueBelowMinimun: (fiatCode: string, minValue: number) =>
    `❌ O valor para ${fiatCode} deve ser de pelo menos ${minValue}. Tente novamente:`,
  fiatValueTooBig:
    "❌ O valor é grande demais para ser processado pelo sistema.",
  invalidRefundAddress:
    "❌ Este endereço de Bitcoin não é válido. Envie-o novamente:",
  invalidBuyerAddress:
    "❌ Este endereço de Bitcoin não é válido. Envie um endereço correto:",
  maxOrdersReached: "❌ Você atingiu o limite de ordens criadas.",
  invalidFiatCode: "❌ O código FIAT não foi reconhecido. Tente novamente:",
  orderAlreadyRated: "❌ A contraparte já foi avaliada.",
  couldNotApplyMargin: "❌ Ocorreu um erro desconhecido ao aplicar a margem. Tente novamente.",
  couldNotFetchPrice: "❌ Ocorreu um erro desconhecido ao buscar o preço da moeda. Tente novamente:"
};