import { Strings, OrderStatus, getFiatEmoji } from "../shared/constants.js";
import { mempoolBaseURL, type MempoolFeesData } from "../core/bitcoin/index.js";
import { MIN_SATS } from "../utils/price.js";
import type { LoanDraft } from "../wizards/types.js";
import type { OrderRecord, UserRecord } from "../types.js";
import { escapeMarkdown } from "../utils/format.js";

export const OrderStatusMap: Record<string, string> = {
  [OrderStatus.Pending]: "⏳ Pendente",
  [OrderStatus.WaitingTakerConfirmation]: "⏳ Aguardando confirmação",
  [OrderStatus.WaitingMakerConfirmation]: "⏳ Aguardando confirmação",
  [OrderStatus.WaitingEscrow]: "📥 Aguardando depósito",
  [OrderStatus.Unconfirmed]: "🔄 Confirmando na rede",
  [OrderStatus.Active]: "🟢 Ativa",
  [OrderStatus.CancelRequested]: "⚠️ Cancelamento solicitado",
  [OrderStatus.FiatSent]: "💸 Fiat enviado",
  [OrderStatus.Releasable]: "🔓 Pronta para liberar",
  [OrderStatus.Refundable]: "↩️ Pronta para reembolso",
  [OrderStatus.Dispute]: "⚖️ Em disputa",
  [OrderStatus.Completed]: "✅ Concluída",
  [OrderStatus.Refunded]: "↩️ Reembolsada",
  [OrderStatus.Cancelled]: "❌ Cancelada",
};

export default {
  // ─────────────────────────── General & UI ───────────────────────────
  helpMessage: () =>
    `🤖 *aBitP2P — Central de Ajuda*\n\n` +
    `🛒 *Mercado*\n` +
    `/buy — Comprar Bitcoin\n` +
    `/sell — Vender Bitcoin\n` +
    `/listorders — Ver suas ordens ativas\n\n` +
    `⚡️ *Gestão de Ordens* (Adicione o ID)\n` +
    `/fiatsent — Notificar pagamento enviado\n` +
    `/release — Liberar fundos ao comprador\n` +
    `/claim — Resgatar fundos ou reembolso\n` +
    `/cancel — Cancelar uma ordem\n` +
    `/dispute — Abrir disputa com moderação\n` +
    `_Ex: /release ab12cd-34ef56_\n\n` +
    `⚙️ *Conta e Sistema*\n` +
    `/setpass — Criptografar seu perfil com uma senha\n` +
    `/setlang — Mudar idioma\n` +
    "/fees - Verifique como estão as taxas de rede para suas ordens\n" +
    "/setfee - Defina a taxa de rede a ser usada\n" +
    `/exit — Cancelar a ação atual\n\n` +
    `📢 Canal: ${Strings.OrderChannelTag}\n` +
    `💬 Grupo: ${Strings.GeneralChatTag}`,
  commandUsage: (usage: string, example?: string) =>
    `⚠️ *Uso:* \`${usage}\` ${example ? `💡 \`${example}\`` : ""}`,
  cancelled: "❌ Processo cancelado.",
  btnYes: "✅ Sim, continuar",
  btnNo: "❌ Não, cancelar",
  btnBuyBitcoin: "Comprar Bitcoin",
  btnSellBitcoin: "Vender Bitcoin",
  actionBuy: "🟢 Comprando",
  actionSell: "🔴 Vendendo",
  buyType: "🟢 Compra",
  sellType: "🔴 Venda",
  payDirectionBuy: "Pagamento via",
  payDirectionSell: "Receber pagamento via",
  marketPrice: "A preço de mercado",

  // ─────────────────────────── Config & Profile ───────────────────────────
  telegramUsernameRequired:
    "❌ **Nome de usuário obrigatório**\n\nVocê precisa configurar um @username no Telegram para interagir com este bot. Vá em *Configurações > Nome de usuário*, configure e tente novamente.",
  setYourPersonalPassword:
    "❌ Primeiro você deve definir sua senha com /setpass para poder pegar ou criar ordens.",
  promptPassword:
    `*⚠️ Uma chave privada vinculada ao seu usuário será gerada, a senha SERÁ NECESSÁRIA para resgatar as ordens.*\n` +
    `*NÃO PODE SER ALTERADA, certifique-se de digitá-la corretamente e anotá-la em um local seguro.*\n\n` +
    "🔑 *Por favor, digite sua senha para configurar seu usuário:*",
  confirmPassword: "👉 Para confirmar, digite a senha novamente: ",
  passwordsDoNotMatch:
    "❌ As senhas não coincidem. Tente novamente com /setpass",
  passwordAlreadySet: "❌ Você já possui uma senha definida.",
  passwordSetSuccess:
    `✅ *Senha configurada com sucesso.* Perfil criptografado e pronto para uso.\n\n` +
    "_Lembre-se de que esta senha serve apenas para assinar saques no bot. Os fundos que você adquirir serão enviados diretamente para o endereço externo que você fornecer; o bot não custodia seus fundos._",
  invalidLanguage: "❌ Idioma inválido.",
  selectLanguage: "👇 Selecione seu idioma preferido",
  languageUpdateSuccess: "✅ Idioma atualizado com sucesso.",

  // ─────────────────────────── Market & Order Creation ───────────────────────────
  promptFiat: "Qual moeda FIAT você deseja usar? (Ex: USD, EUR, BRL)",
  promptAmount: "Indique o valor ou faixa (Ex: 500-1000 ou 100)",
  promptMargin: "Selecione a margem nos botões abaixo 👇",
  promptPaymentMethod: "Digite o método de pagamento (Ex: Pix, Transferência)",
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
    `⚠️ *Valor insuficiente após aplicar margem*\n\n` +
    `Ao aplicar sua margem de ${margin}\%, o total a receber caiu para${satsAmount.toLocaleString()} sats.\n\n` +
    `Para atingir o mínimo de ${MIN_SATS.toLocaleString()} sats, você deve iniciar a ordem com pelo menos *$${minFiatRequired.toFixed(2)}${fiatCode}*.\n\n` +
    `🔄 Por favor, inicie a criação da ordem novamente.`,
  wizardPreview: (
    type: string,
    fiat: string,
    amount: string,
    margin: string,
    method: string,
    prompt: string,
  ) =>
    `🛠 *Criando Ordem (${type})*\n\n` +
    `▪️ Moeda: \`${fiat}\`\n` +
    `▪️ Valor/Faixa: \`${amount}\`\n` +
    `▪️ Margem: \`${margin}\`\n` +
    `▪️ Método: \`${method}\`\n\n` +
    `_Use /exit a qualquer momento para cancelar_\n\n` +
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
    `Por ${amountFiat.split("-").join(" - ")} ${fiat}${getFiatEmoji(fiat)}\n` +
    `💳 ${payDirection}${method}\n` +
    `📈 Taxa: ${margin === 0 ? "A preço de mercado" : `yadio.io ${margin > 0 ? "+" + margin : margin}%`}\n\n` +
    `👤 **Contraparte:**\n` +
    `▪️ ${tradesCount} operações de sucesso\n` +
    `▪️ Usa o bot há ${daysUsing} dias\n` +
    `▪️ ${rating.toFixed(1)} ${"⭐".repeat(Math.floor(rating))} (${ratingCount})\n\n` +
    `${hashtag}\n` +
    `\`${id}\``,
  orderPublishedSuccess: (orderId: string) =>
    `✅ *Ordem publicada com sucesso no canal!*\n` +
    `Você pode cancelá-la usando \`/cancel ${orderId}\`\n` +
    `👉 ${Strings.OrderChannelTag}`,
  listOrders: (list: OrderRecord[]) => {
    if (list.length === 0) return "📭 Você não tem ordens registradas.";

    const blocks = list.map((o) => {
      const typeLabel = o.type === "SELL" ? "🔴 Venda" : "🟢 Compra";
      const statusLabel = OrderStatusMap[o.status] || o.status;
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

      return (
        `📄 *Ordem:* \`${o.id}\`\n` +
        `▪️ Tipo: ${typeLabel}\n` +
        `▪️ Valor: \`${o.fiatAmountLocked ?? o.amountFiat} ${o.fiatCode}\`\n` +
        `▪️ Margem: \`${marginLabel}\`\n` +
        `▪️ Status: ${statusLabel}\n` +
        `▪️ Criada em: ${createdDate}`
      );
    });

    return blocks.join("\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n");
  },
  orderExpiredCancelled: (orderId: string) =>
    `⌛ *Ordem expirada*\n\nSua ordem \`${orderId}\` passou 24 horas publicada sem ser aceita. Ela foi cancelada automaticamente e removida do canal.`,

  // ─────────────────────────── Matchmaking & Confirmations ───────────────────────────
  orderTaken: "⚠️ Esta ordem já foi aceita por outra pessoa.",
  cantTakeOwnOrder: "❌ Você não pode pegar sua própria ordem.",
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
    `▪️ Valor: ${amount}${fiat}\n` +
    `▪️ Taxa: ${margin === 0 ? "A preço de mercado" : `yadio.io ${margin > 0 ? "+" + margin : margin}%`}\n` +
    `▪️ Método: ${method}\n\n` +
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
    `Alguém quer pegar sua ordem de *${type}*.\n\n` +
    `▪️ Valor: ${amount}${fiat}\n` +
    `▪️ Taxa: ${margin === 0 ? "A preço de mercado" : `yadio.io ${margin > 0 ? "+" + margin : margin}%`}\n` +
    `▪️ Método: ${method}\n\n` +
    `👤 **Dados da contraparte:**\n` +
    `▪️ Operações: ${trades}\n` +
    `▪️ Tempo de conta: ${days} dias\n` +
    `▪️ Reputação: ${rating.toFixed(1)}/5.0\n\n` +
    `Deseja confirmar e iniciar a negociação?\n\n` +
    `ID: \`${id}\``,
  promptExactAmount: (range: string, fiat: string) =>
    `Esta ordem permite uma faixa de **${range}${fiat}**.\n\n` +
    `💬 *Por favor, digite o valor exato* no chat pelo qual você deseja negociar (apenas números):`,
  askBuyerAddress: (estimatedSats: number) =>
    "📍 *Por favor, envie seu endereço Bitcoin on-chain* onde você receberá os fundos.\n_(Certifique-se de que está correto, não nos responsabilizamos por erros de digitação)_\n\n" +
    "A quantidade estimada a receber é de: `" +
    estimatedSats / 100_000_000 +
    "` BTC (antes das taxas de rede).",
  waitMaker:
    "⏳ Perfeito. Por favor, *aguarde a contraparte confirmar* se deseja continuar com a ordem.",
  waitTaker:
    "⏳ Endereço salvo. Agora *aguarde o vendedor depositar* os fundos no endereço multisig.",
  acceptedNowWaitingEscrow: `✅ *Ordem aceita.*\n\n⏳ Aguardando o vendedor enviar os fundos para o endereço multisig, isso pode levar alguns minutos...`,

  // ─────────────────────────── Escrow & Network ───────────────────────────
  missingPubkeys:
    "❌ Erro crítico: Faltam chaves públicas para gerar o endereço multisig.",
  askSellerEscrow: (sats: number, address: string) =>
    `⚡ *Fundo do Cofre Requerido*\n\n` +
    `Por favor, envie \`${sats / 100_000_000}\` BTC para o seguinte endereço multisig on-chain:\n\n` +
    `\`${address}\`\n\n` +
    `_Assim que a transação for confirmada (2 confirmações), colocaremos vocês em contato. Por favor, certifique-se de enviar o valor EXATO, caso contrário, pode exigir atenção manual._`,
  escrowUnconfirmed: (escrowAddress: string) =>
    `⏳ *Transação detectada na rede.*\n\n` +
    `[Ver no explorador](${mempoolBaseURL}/address/${escrowAddress}) \n` +
    `_Aguardando 2 confirmações para prosseguir com segurança com a ordem..._`,
  escrowFundingFailed: (
    utxoCount: number,
    totalFundedSats: number,
    expectedSats: number,
    orderId: string,
  ) =>
    `❌ *Falha no depósito*\n\nForam detectados ${utxoCount} depósitos, mas o valor ainda é inferior ao esperado (${totalFundedSats / 100_000_000} BTC recebidos de${expectedSats / 100_000_000} BTC necessários). O limite máximo é de 2 transações.\n\nA ordem foi cancelada. Execute \`/claim ${orderId}\` para solicitar o reembolso dos fundos parciais enviados.`,
  incompleteFunding: (
    totalFundedSats: number,
    expectedSats: number,
    remainingSats: number,
  ) =>
    `⚠️ *Depósito incompleto*\n\nDetectamos a chegada de ${totalFundedSats / 100_000_000} BTC, mas a ordem requer${expectedSats / 100_000_000} BTC.\n\nFalta depositar: \`${remainingSats / 100_000_000}\` BTC.\n\n_Você tem 1 tentativa de envio adicional. Se o segundo depósito não completar a quantia exigida, a ordem será cancelada e reembolsada._`,
  fundingExpired:
    "⚠️ Sua ordem expirou por não completar o depósito a tempo. Use /claim para reembolsar os fundos parciais enviados para o endereço.",
  sellerDidNotFund: (orderId: string) =>
    `⚠️ *O vendedor não depositou*\n\nO usuário que pegou sua ordem \`${orderId}\` não realizou o depósito no tempo estabelecido. Sua oferta foi republicada no canal.`,
  partialDepositCancelled:
    "❌ Você cancelou a ordem com um depósito parcial. Use /claim para solicitar o reembolso dos fundos enviados.",
  orderCancelledSellerFunding: `❌ *Ordem cancelada*\n\nO vendedor não concluiu o depósito corretamente dentro do limite de envios permitidos. A ordem foi cancelada automaticamente e os fundos serão devolvidos ao seu dono.`,
  orderCancelledTransactionDisappeared:
    "❌ *Ordem cancelada*\n\nA transação desapareceu da rede (RBF ou removida do mempool).",
  orderCancelledSellerDepositReverted:
    "❌ *Ordem cancelada*\n\nO depósito do vendedor foi revertido ou desapareceu da rede.",
  tamperingDetected:
    "❌ *Manipulação detectada*\n\nFoi detectada uma reversão parcial dos fundos na rede. A ordem foi cancelada. Execute /claim para recuperar o saldo restante.",
  orderCancelledDepositAltered:
    "❌ *Ordem cancelada*\n\nO depósito foi alterado na rede antes de ser confirmado. O acordo foi abortado para sua segurança.",
  escrowConfirmedBuyer: (sellerContact: string, orderId: string) =>
    `✅ *Depósito Confirmado!*\n\n` +
    `Os fundos estão assegurados no endereço multisig.\n\n` +
    `🗣 **Contate o vendedor aqui:** ${sellerContact}\n\n` +
    `_Instruções: Faça o pagamento pelo método acordado. Assim que transferir o dinheiro, execute o comando_ \`/fiatsent ${orderId}\` _para notificar o vendedor._`,
  escrowConfirmedSeller: (buyerContact: string, orderId: string) =>
    `✅ *Depósito Confirmado!*\n\n` +
    `Seus fundos estão assegurados no endereço multisig.\n\n` +
    `🗣 **Contate o comprador aqui:** ${buyerContact}\n\n` +
    `_Instruções: Aguarde o pagamento do comprador. Assim que você verificar que o dinheiro está na sua conta, execute o comando_ \`/release ${orderId}\` _para liberar os fundos._`,
  feesList: (
    botFee: string,
    feesData: MempoolFeesData,
    customFee?: number | null,
  ) =>
    "⚡ *Taxas de Rede (Mempool)*\n\n" +
    "┌ ▸ Rápida 🚀\n" +
    `│   \`${feesData.fastestFee}\` sat/vB\n` +
    "├ ▸ Média ⚡\n" +
    `│   \`${feesData.halfHourFee}\` sat/vB\n` +
    "├ ▸ Lenta 🐢\n" +
    `│   \`${feesData.hourFee}\` sat/vB\n` +
    "└ ▸ *Econômica* ✅ *(padrão)*\n" +
    `    \`${feesData.economyFee}\` sat/vB\n\n` +
    (customFee
      ? `🎯 *Sua Taxa Personalizada* ✅ *(ativa)*\n   \`${customFee}\` sat/vB\n\n`
      : "") +
    "━━━━━━━━━━━━━━━━━━━━\n\n" +
    "🤖 *Taxa do Protocolo*\n" +
    `   \`${botFee}%\`\n` +
    "   └ Dividida 50/50 entre ambas as partes\n\n" +
    "💡 " +
    (customFee
      ? "Você está usando sua taxa de rede personalizada em vez da econômica. Você pode atualizá-la a qualquer momento com /setfee."
      : "A taxa econômica é suficiente para a transação ser confirmada nas próximas horas sem pagar a mais."),
  customFeeChanged: (newFee: number) =>
    `✅ A taxa de rede foi definida para ${newFee} sats/vB`,
  couldNotFetchFees:
    "❌ Não foi possível obter as taxas atuais, tente novamente mais tarde.",
  resetFeeButton: "♻️ Voltar ao padrão (Econômica)",
  feeResetSuccess:
    "✅ Sua taxa retornou para a configuração econômica padrão.",
  errorProcessingTx: (err: string) => `❌ *Erro de rede:*\n\`${err}\``,

  // ─────────────────────────── Fiat & Release ───────────────────────────
  selectReleasableOrder:
    "👇 Selecione a ordem que você deseja liberar os fundos em Bitcoin:",
  noReleasableOrdersFound:
    "📭 Você não tem ordens pendentes para liberar.\n\nVocê deve aguardar o comprador fazer o pagamento e confirmá-lo usando `/fiatsent`.",
  selectOrderToMarkAsPaid:
    "👇 Selecione a ordem que você deseja marcar como paga:",
  noActiveOrdersFound:
    "📭 Você não tem ordens ativas pendentes de pagamento.\n\nVocê deve aguardar o vendedor depositar os fundos no cofre ou pegar uma nova oferta.",
  fiatSentToBuyer: (orderId: string) =>
    `✅ Você marcou a ordem \`${orderId}\` como paga.\n\n` +
    `O vendedor foi notificado. Por favor, aguarde até que ele confirme o recebimento em sua conta e libere os fundos.`,
  fiatSentToSeller: (orderId: string, buyerName: string) =>
    `🔔 *Pagamento reportado pelo comprador!*\n\n` +
    `${buyerName} indica que já enviou o pagamento FIAT para a sua conta.\n\n` +
    `**INSTRUÇÕES:**\n` +
    `1. Verifique sua conta bancária ou método de pagamento acordado.\n` +
    `2. Confirme que o valor está correto.\n` +
    `3. Se tudo estiver certo, libere os Bitcoins executando:\n\n` +
    `\`/release ${orderId}\``,
  askReleaseConfirmation: (buyerName: string) =>
    `⚠️ *Confirmação de Liberação*\n\n` +
    `Você está prestes a liberar os fundos de Bitcoin do cofre a favor de @**${buyerName}**.\n\n` +
    `🏦 *Antes de continuar, é estritamente necessário que você entre em sua conta bancária ou carteira e verifique por si mesmo que o pagamento foi devidamente creditado.*\n\n` +
    `_Lembre-se de que, uma vez liberados, os fundos de Bitcoin não poderão ser recuperados sob nenhuma circunstância._\n\n` +
    `Deseja confirmar a liberação definitiva dos fundos?`,
  releaseSuccessSeller: (orderId: string) =>
    `✅ Você autorizou a liberação da ordem \`${orderId}\`.\n\n` +
    `O comprador foi notificado para assinar e resgatar seu Bitcoin. Obrigado por usar o serviço!`,
  releaseToBuyer: (orderId: string) =>
    `🎉 *O vendedor liberou os fundos!*\n\n` +
    `Os fundos estão prontos para serem resgatados. Execute o seguinte comando para iniciar o saque para a sua carteira:\n\n` +
    `\`/claim ${orderId}\``,
  rangeOrderPartiallyCompleted: (
    newOrderId: string,
    newAmountFiat: string,
    fiatCode: string,
  ) =>
    `ℹ️ Sua ordem com faixa de valor foi parcialmente concluída. Uma nova ordem (\`${newOrderId}\`) pelo saldo restante de *${newAmountFiat} ${fiatCode}* foi republicada no${Strings.OrderChannelTag}.`,

  // --------------------------- Rating -----------------------------------
  rateCounterpartyMessage: "👉 Por favor, avalie sua contraparte:",
  ratingDone: (stars: number) =>
    `⭐ Você avaliou sua contraparte com ${stars} estrelas.`,

  // ─────────────────────────── Claim & Refund ───────────────────────────
  selectClaimableOrder:
    "👇 Selecione a ordem da qual você deseja resgatar os fundos:",
  noClaimableOrdersFound:
    "📭 Você não tem ordens prontas para sacar ou reembolsar.",
  askClaimPassword: (
    minerFee: number,
    finalAmount: number,
    receivingAddress: string,
    minerFeeRate: number,
  ) =>
    `🔐 *Resgatar Fundos*\n\n` +
    `**Detalhamento da transação:**\n` +
    `▪️ Endereço: \`${receivingAddress}\`\n` +
    `▪️ Taxa do minerador (est): \`-${minerFee / 100_000_000} BTC\` (${minerFeeRate} sats/vB)\n` +
    `▪️ **Você receberá aprox:** \`${finalAmount / 100_000_000} BTC\`\n\n` +
    `💡 *Nota:* Se você não concorda com a taxa de mineração, pode enviar /exit para cancelar e usar /setfee para definir sua própria tarifa.\n\n` +
    `Por favor, **digite sua senha** para assinar criptograficamente o saque para sua carteira:`,
  psbtSigningLoading: `⏳ *Coassinando e transmitindo para a rede...*`,
  claimSuccess: (txid: string) =>
    `🎉 *Saque Bem Sucedido!*\n\nOs fundos estão a caminho da sua carteira.\n🔎 [Ver TX](${mempoolBaseURL}/tx/${txid})`,
  askRefundAddress: `📍 Por favor, envie o endereço Bitcoin no qual você deseja receber seu reembolso:`,
  refundSuccess: (txid: string) =>
    `🎉 *Reembolso Bem Sucedido!*\n\nSeus fundos estão retornando para sua carteira.\n🔎 [Ver TX](${mempoolBaseURL}/tx/${txid})`,
  refundCompletedNotification: (orderId: string) =>
    `ℹ️ *Ordem Cancelada*\n\nO vendedor resgatou o reembolso da ordem \`${orderId}\`. Os fundos foram devolvidos ao seu endereço original.`,

  // ─────────────────────────── Cancellations ───────────────────────────
  selectOrderToCancel:
    "👉 Selecione a ordem que você quer cancelar, você pode ver os detalhes com /listorders",
  cancelNotAllowed: `❌ Você não pode cancelar a ordem neste estado. Se o pagamento já foi enviado, você deverá abrir uma disputa.`,
  cancelUnconfirmed: `⏳ A ordem tem uma transação não confirmada na rede. Você deve aguardar 2 confirmações antes de iniciar um cancelamento.`,
  cancelAlreadyRequested: `⏳ Você já solicitou o cancelamento. Aguardando sua contraparte aceitar e assinar.`,
  cancelOnlySeller: `❌ Apenas o vendedor pode cancelar a ordem neste estado.`,
  cancelAddressWait:
    "❌ Você deve esperar pelo menos 10 minutos desde que o endereço foi gerado antes de cancelar, para evitar problemas com transações em trânsito.",
  counterpartyCanceledDeleted: (orderId: string) =>
    `🚫 Sua contraparte cancelou a ordem \`${orderId}\`.`,
  matchCancelledRepublished: (orderId: string) =>
    `🚫 Sua contraparte cancelou o acordo da ordem \`${orderId}\`.\n\nA ordem foi republicada no canal para que outro usuário possa pegá-la.`,
  cancelNotifiedCounterparty: (orderId: string) =>
    `🔔 *Solicitação de Cancelamento*\n\nSua contraparte solicitou o cancelamento da ordem \`${orderId}\`. Se você concorda, execute \`/cancel ${orderId}\` para confirmar e reembolsar os fundos ao vendedor.\n\n` +
    `⚠️ Se você já efetuou o pagamento, abra uma disputa, não aceite o cancelamento: \`/dispute ${orderId}\``,
  cancelAccepted: (orderId: string) =>
    `✅ *Cancelamento confirmado.*\n\nA ordem \`${orderId}\` foi cancelada por mútuo acordo. Os fundos serão reembolsados ao vendedor.`,
  cancelAcceptedSeller: (orderId: string) =>
    `✅ *Cancelamento confirmado.*\n\nA ordem \`${orderId}\` foi cancelada por mútuo acordo. Você pode resgatar o reembolso dos seus fundos executando:\n\n\`/claim ${orderId}\``,
  cancelRequestSuccess: `✅ Você solicitou o cancelamento. Aguardando sua contraparte aprovar com /cancel.`,
  orderCancelled: "🚫 A ordem foi cancelada.",

  // ─────────────────────────── Disputes ───────────────────────────
  disputeNotAllowed: `❌ Você não pode abrir uma disputa no estado atual da ordem. Disputas aplicam-se apenas a ordens com fundos ativos no endereço multisig.`,
  disputeAlreadyOpen: `⚠️ Já existe uma disputa aberta para esta ordem.`,
  disputeOpened: (code: string, orderId: string) =>
    `⚖️ *Sua disputa foi aberta.*\n\n` +
    `Ordem: \`${orderId}\`\n\n` +
    `Seu código de verificação é: \`${code}\`\n\n` +
    `Este código serve *unicamente* para comprovar a identidade do administrador que pegar sua disputa.\n\n` +
    `⚠️ *IMPORTANTE:* nenhum administrador escreverá para você antes que o bot o notifique oficialmente sobre quem pegou sua disputa. Se alguém alegar ser administrador antes dessa notificação, não continue a conversa.`,
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
    `Valor: ${amountFiat}${fiatCode}\n` +
    `Estado anterior: \`${status}\`\n` +
    `Escrow: \`${escrowAddress}\`\n\n` +
    `👤 Comprador: @${buyerUsername}\n` +
    `👤 Vendedor: @${sellerUsername}\n\n` +
    `🔑 Código verificação comprador: \`${buyerCode}\`\n` +
    `🔑 Código verificação vendedor: \`${sellerCode}\`\n\n` +
    `Para assumir esta disputa, execute:\n\`/takedispute ${orderId}\``,
  disputeNotFoundOrNotOpen: `❌ Esta ordem não existe ou não está atualmente em disputa.`,
  disputeAlreadyTaken: `⚠️ Esta disputa já foi assumida por outro administrador.`,
  disputeTakenSuccessAdmin: (orderId: string) =>
    `✅ Você assumiu a disputa da ordem \`${orderId}\`. Ambas as partes foram notificadas.\n\nQuando você tiver uma resolução, execute:\n\`/settle ${orderId}\``,
  disputeTakenNotification: (
    adminHandle: string,
    code: string,
    orderId: string,
  ) =>
    `⚖️ *Disputa Atribuída*\n\n` +
    `A disputa da ordem \`${orderId}\` foi assumida por *${adminHandle}*.\n\n` +
    `Seu código de verificação: \`${code}\`\n\n` +
    `⚠️ Nenhum admin escreveu para você antes desta mensagem. Antes de compartilhar qualquer informação:\n` +
    `1️⃣ Verifique se o username coincide com o desta mensagem.\n` +
    `2️⃣ Peça a ele para dizer seu código de verificação.\n` +
    `3️⃣ O código deve coincidir exatamente com o acima.\n\n` +
    `O código por si só não dá nenhuma permissão ao administrador nem modifica sua disputa.`,
  disputeTakenNotificationNoCode: (adminHandle: string, orderId: string) =>
    `⚖️ *Disputa Atribuída*\n\n` +
    `A disputa da ordem \`${orderId}\` foi assumida por *${adminHandle}*.\n\n` +
    `⚠️ Nenhum admin escreveu para você antes desta mensagem. Verifique se o username coincide exatamente com o acima antes de compartilhar qualquer informação com quem entrar em contato.`,
  adminOnlyAction: `❌ Apenas um administrador autorizado pode executar esta ação.`,
  settleNotFoundOrNotInDispute: `❌ Esta ordem não existe ou não está em disputa.`,
  settleNotAssignedAdmin: `❌ Apenas o administrador designado para esta disputa pode resolvê-la.`,
  settleStaleAction: `⚠️ Esta disputa já foi resolvida anteriormente. Este botão não é mais válido.`,
  settlePrompt: (orderId: string, buyerHandle: string, sellerHandle: string) =>
    `⚖️ *Resolver disputa* \`${orderId}\`\n\n` +
    `👤 Comprador: ${buyerHandle}\n` +
    `👤 Vendedor: ${sellerHandle}\n\n` +
    `Selecione uma resolução:`,
  settleBtnBuyer: (buyerHandle: string) =>
    `✅ A favor do comprador (${buyerHandle})`,
  settleBtnSeller: (sellerHandle: string) =>
    `✅ A favor do vendedor (${sellerHandle})`,
  settleBtnRefund: `↩️ Cancelar ordem / Reembolsar ao vendedor`,
  settleResolvedAdmin: (orderId: string, resolution: string) =>
    `✅ Disputa \`${orderId}\` resolvida: *${resolution}*.\n\nAmbas as partes foram notificadas.`,
  settleBuyerWinsNotifyBuyer: (orderId: string) =>
    `⚖️ *Disputa resolvida a seu favor.*\n\nA ordem \`${orderId}\` foi resolvida a favor do comprador. Você já pode resgatar seus fundos executando:\n\n\`/claim ${orderId}\``,
  settleBuyerWinsNotifySeller: (orderId: string) =>
    `⚖️ *Disputa resolvida.*\n\nA ordem \`${orderId}\` foi resolvida a favor do comprador. Os fundos serão liberados para o endereço dele.`,
  settleSellerWinsNotifySeller: (orderId: string) =>
    `⚖️ *Disputa resolvida a seu favor.*\n\nA ordem \`${orderId}\` foi resolvida a seu favor. Você pode recuperar seus fundos executando:\n\n\`/claim ${orderId}\``,
  settleSellerWinsNotifyBuyer: (orderId: string) =>
    `⚖️ *Disputa resolvida.*\n\nA ordem \`${orderId}\` foi resolvida a favor do vendedor. Os fundos serão devolvidos ao dono original.`,
  settleCancelledNotifyBuyer: (orderId: string) =>
    `↩️ *Disputa resolvida: ordem cancelada.*\n\nO administrador determinou cancelar a ordem \`${orderId}\`. Os fundos serão devolvidos ao vendedor.`,
  settleCancelledNotifySeller: (orderId: string) =>
    `↩️ *Disputa resolvida: ordem cancelada.*\n\nO administrador determinou cancelar a ordem \`${orderId}\`. Os fundos poderão ser reembolsados usando o comando \`/claim ${orderId}\`.`,
  settleResolutionBuyerLabel: "A favor do comprador",
  settleResolutionSellerLabel: "A favor do vendedor",
  settleResolutionRefundLabel: "Cancelar / Reembolsar ao vendedor",

  // ─────────────────────────── Errors & Validations ───────────────────────────
  noOrdersFound: "❌ Nenhuma ordem criada por você foi encontrada.",
  orderNotFound: `❌ Ordem não encontrada.`,
  invalidOrderStatus: `❌ Você não pode realizar esta ação no estágio atual da ordem.`,
  waitForBuyerFiatSent: (orderId: string) =>
    "❌ Você deve notificar o comprador para marcar a ordem como paga com `/fiatsent " +
    orderId +
    "`",
  onlyBuyer: `❌ Apenas o comprador pode realizar esta ação.`,
  onlySeller: `❌ Apenas o vendedor pode autorizar esta ação.`,
  unauthorizedAccess: `❌ Você não tem permissão para esta ordem.`,
  invalidPassword: (retryCommand: string) =>
    `❌ Senha incorreta. Por favor, tente novamente com \`${retryCommand}\``,
  invalidAmountRange: (min: number, max: number) =>
    `❌ O valor é inválido. Deve ser um número entre **${min}** e **${max}**.\nTente novamente:`,
  fiatValueBelowMinimun: (fiatCode: string, minValue: number) =>
    `❌ A quantia para ${fiatCode} deve ser de pelo menos${minValue}. Tente novamente:`,
  fiatValueTooBig:
    "❌ O valor é grande demais para ser processado pelo sistema.",
  invalidRefundAddress:
    "❌ Esse endereço Bitcoin não é válido. Por favor, envie novamente:",
  invalidBuyerAddress:
    "❌ Esse endereço Bitcoin não é válido. Por favor, envie um endereço correto:",
  maxOrdersReached: "❌ Você atingiu o limite de ordens ativas.",
  invalidFiatCode: "❌ O código fiat não foi reconhecido, tente novamente:",
  orderAlreadyRated: "❌ A contraparte já havia sido avaliada.",
  couldNotApplyMargin:
    "❌ Erro desconhecido ao aplicar a margem, tente novamente.",
  couldNotFetchPrice:
    "❌ Erro desconhecido ao buscar o código da moeda, tente novamente:",
  priceApiErrorRepublish:
    "❌ *Erro de conexão ao calcular o preço.*\n\nO acordo foi cancelado e a ordem foi automaticamente republicada no canal. Por favor, tente novamente mais tarde.",
  makerTimeoutNotifyMaker: (orderId: string) =>
    `❌ *Ordem cancelada por inatividade*\n\nSua ordem \`${orderId}\` foi cancelada porque você não confirmou a solicitação a tempo.`,
  makerTimeoutNotifyTaker: (orderId: string) =>
    `❌ *Ordem cancelada*\n\nO criador da ordem \`${orderId}\` não respondeu a tempo. A ordem foi cancelada.`,
  takerTimeoutNotifyTaker: (orderId: string) =>
    `⏳ *Tempo esgotado*\n\nSeu tempo para preencher os detalhes da ordem \`${orderId}\` expirou. A ordem foi republicada no canal; se ainda desejar prosseguir, terá que pegá-la novamente.`,
  alreadyHaveActiveOrder:
    "❌ Você já tem uma ordem em andamento. Você deve terminá-la ou cancelá-la antes de pegar outra.",
  invalidCustomFee:
    "❌ O valor deve ser igual ou superior a 0.8, menor que 20 e ter até 2 casas decimais.",

  // ─────────────────────────── Loans ───────────────────────────
  lendType: "🟢 Emprestando",
  borrowType: "🔴 Tomando emprestado",
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
    `🏦 *Estruturando Empréstimo (${type})*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `▪️ Capital: \`${amount} ${fiat}\`\n` +
    `▪️ Garantia (LTV): \`${ltv}\`\n` +
    `▪️ Taxa Anual (APR): \`${apr}\`\n` +
    `▪️ Prazo: \`${duration} mês(es)\`\n` +
    `▪️ Método de pagamento: \`${method}\`\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Para abortar o processo digite /exit_\n\n` +
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
      `Por ${draft.amount} ${draft.fiat}${getFiatEmoji(draft.fiat!)}\n` +
      `💳 Método: ${method}\n` +
      `⏳ Prazo: ${draft.durationMonths} meses\n` +
      `📈 APR (Taxa Anual): ${draft.apr}%\n` +
      `🛡️ LTV (Garantia): ${draft.ltv}%\n\n` +
      `👤 **Contraparte:**\n` +
      `▪️ ${user.tradesCount} operações de sucesso\n` +
      `▪️ Usa o bot há ${daysUsing} dias\n` +
      `▪️ ${user.rating.toFixed(1)} ${"⭐".repeat(Math.floor(user.rating))} (${user.ratingCount})\n\n` +
      `${hashtag}\n` +
      `\`${loanId}\``
    );
  },
  loanPublishedSuccess: (loanId: string) =>
    `✅ *Sua oferta de empréstimo foi publicada no canal.*\nNós notificaremos quando alguém pegá-la.\n\nID: \`${loanId}\``,
  actionLend: "🟢 Oferece empréstimo",
  actionBorrow: "🔴 Tomando emprestado",
  btnTakeLoanBorrow: "Pegar emprestado",
  btnTakeLoanLend: "Emprestar",
  invalidLoanDuration:
    "❌ A duração deve ser um número inteiro (ou faixa, ex: 3-6) entre 1 e 120 meses. Tente novamente:",
  invalidLoanDurationRange: (min: number, max: number) =>
    `❌ A duração deve estar entre ${min} e${max} meses. Tente novamente:`,
  promptLoanLTV:
    "🛡️ Selecione o Loan-to-Value (LTV) 👇\n_Define quanto colateral é exigido. Ex: Com um LTV de 50%, um empréstimo de $1.000 exigirá bloquear $2.000 em Bitcoin como garantia._",
  promptLoanDuration: "Digite a duração do contrato em **meses**:",
  promptLoanPaymentMethod:
    "Digite o método para enviar/receber o FIAT (Ex: Pix, Transferência, etc.)",
  promptLoanAPR:
    "Digite a Taxa de Juros Anual (APR) em porcentagem (Ex: 5, 8.5, 12):",

  invalidLoanAPR:
    "❌ O APR deve ser um número válido (maior que 0 e menor que 100). Você pode usar decimais. Tente novamente:",
  maxLoansReached:
    "❌ Você atingiu o limite de anúncios de empréstimos publicados.",

  cancelLoanForbidden:
    "❌ Você não pode cancelar um empréstimo depois que o dinheiro FIAT foi enviado ou o contrato está ativo. Se houver um problema, você deve abrir uma disputa usando /dispute.",
  loanCancelOnlyBorrower:
    "❌ Apenas o tomador pode cancelar o empréstimo neste estado.",

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
    `▪️ Capital: ${amount} ${fiat}${getFiatEmoji(fiat)}\n` +
    `▪️ Garantia (LTV): ${ltv}%\n` +
    `▪️ APR: ${apr}%\n` +
    `▪️ Prazo: ${duration} meses\n` +
    `▪️ Método: ${method}\n\n` +
    `Você tem certeza de que deseja pegar esta oferta?\n\n` +
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
      `📋 *Resumo Final do Empréstimo*\n\n` +
      `▪️ Capital: ${amount}${fiat}\n` +
      `▪️ Prazo: ${duration} meses\n` +
      `▪️ Método: ${method}\n\n`;

    if (role === "LENDER") {
      text += `▪️ APR: ${apr}%\n`;
      text += `💰 **A receber no final (Aprox):** ${totalReturn}${fiat}\n`;
      text += `_(O tomador depositará colateral em BTC para garantir seu capital)_\n\n`;
    } else {
      text += `▪️ Garantia (LTV): ${ltv}%\n`;
      text += `▪️ Juros a pagar (APR): ${apr}%\n`;
      text += `💰 **Total a devolver:** ${totalReturn}${fiat}\n`;
      text += `🔒 Colateral estimado a bloquear: ${estimatedCollateral} BTC\n\n`;
    }
    text += `Deseja confirmar os termos e notificar a contraparte?\n\nID: \`${id}\``;
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
      `Alguém aceitou sua oferta de empréstimo e definiu os termos exatos:\n\n` +
      `▪️ Capital: ${amount}${fiat}\n` +
      `▪️ Prazo: ${duration} meses\n` +
      `▪️ Método: ${method}\n\n`;

    if (role === "LENDER") {
      text += `▪️ APR: ${apr}%\n`;
      text += `💰 **A receber no final (Aprox):** ${totalReturn}${fiat}\n`;
      text += `_(O tomador bloqueará ${collateralSats} BTC como garantia)_\n\n`;
    } else {
      text += `▪️ Garantia (LTV): ${ltv}%\n`;
      text += `▪️ Juros a pagar (APR): ${apr}%\n`;
      text += `💰 **Total a devolver:** ${totalReturn}${fiat}\n`;
      text += `🔒 Colateral a bloquear: ${collateralSats} BTC\n\n`;
    }

    text +=
      `👤 **Dados da contraparte:**\n` +
      `▪️ Operações: ${trades}\n` +
      `▪️ Tempo de conta: ${days} dias\n` +
      `▪️ Reputação: ${rating.toFixed(1)}/5.0\n\n` +
      `Deseja aceitar este contrato e avançar para o financiamento do cofre?\n\nID: \`${id}\``;
    return text;
  },
  promptLoanExactAmount: (range: string, fiat: string) =>
    `Esta oferta de empréstimo permite uma faixa de capital de **${range}${fiat}**.\n\n` +
    `💬 *Digite o valor exato* no chat que você deseja (apenas números):`,
  promptLoanExactDuration: (range: string) =>
    `Esta oferta permite um prazo de **${range} meses**.\n\n` +
    `💬 *Digite no chat a quantidade exata de meses* que você deseja para este empréstimo:`,
  waitLoanMaker:
    "⏳ Perfeito. *Aguarde o criador da oferta confirmar* se deseja prosseguir com o empréstimo.",
  askBorrowerEscrow: (sats: number, address: string) =>
    `⚡ *Bloqueio de Garantia (Colateral) Requerido*\n\n` +
    `Por favor, envie \`${sats / 100_000_000}\` BTC para o seguinte endereço do cofre multisig:\n\n` +
    `\`${address}\`\n\n` +
    `_Assim que a transação for confirmada (2 confirmações), o credor será notificado para lhe enviar o FIAT. Certifique-se de enviar o valor EXATO._`,

  waitBorrowerDeposit:
    "⏳ *Empréstimo Aceito.*\n\nAgora estamos aguardando o tomador depositar o Bitcoin de garantia no cofre multisig. Notificaremos quando os fundos estiverem garantidos na blockchain.",

  loanCollateralSecuredBorrower: (lenderContact: string, loanId: string) =>
    `✅ *Garantia bloqueada e confirmada!* (\`${loanId}\`)\n\n` +
    `Seu colateral em Bitcoin está assegurado no cofre multisig.\n\n` +
    `🗣 **Contate o credor aqui:** ${lenderContact}\n\n` +
    `_O credor foi notificado para enviar o capital FIAT. Enviaremos uma mensagem quando ele marcar o desembolso como enviado._`,

  loanCollateralSecuredLender: (
    borrowerContact: string,
    fiatAmount: number,
    fiatCode: string,
    loanId: string,
  ) =>
    `✅ *Garantia bloqueada e confirmada!*\n\n` +
    `O tomador garantiu com sucesso seu Bitcoin no cofre multisig.\n\n` +
    `🗣 **Contate o tomador aqui:** ${borrowerContact}\n\n` +
    `**INSTRUÇÕES:**\n` +
    `Por favor, proceda a desembolsar o capital acordado de **${fiatAmount}${fiatCode}** ao tomador por meio de seu método de pagamento.\n\n` +
    `Assim que enviar o dinheiro, execute este comando para iniciar o relógio do empréstimo:\n` +
    `\`/fiatsent ${loanId}\``,
  loanFiatSentToLender: (loanId: string) =>
    `✅ Você marcou o desembolso do empréstimo \`${loanId}\` como enviado.\n\n` +
    `O tomador foi notificado para verificar sua conta. O contrato passará a estar **ATIVO** e o tempo começará a contar **apenas** quando ele confirmar o recebimento do dinheiro.\n\n` +
    `⏳ Se a contraparte não confirmar o recebimento em um tempo razoável, você poderá abrir uma disputa para que um administrador revise o caso.`,

  loanFiatSentToBorrower: (loanId: string, lenderName: string) =>
    `🔔 *O credor enviou o FIAT!*\n\n` +
    `@${lenderName} indica que já transferiu o capital para a sua conta do empréstimo \`${loanId}\`.\n\n` +
    `Por favor, verifique sua conta bancária ou método de pagamento. Assim que verificar que os fundos estão disponíveis, clique no botão de confirmação abaixo 👇.\n\n` +
    `⚠️ O contrato não passará para o estado ATIVO até que você confirme o recebimento.\n\n` +
    `⚖️ *Não recebeu o dinheiro?* Se o tempo de processamento normal passou e os fundos não chegarem, você pode executar /dispute para abrir uma disputa.`,
  noActiveLoansFound:
    "❌ Não foram encontrados empréstimos para os quais você possa fazer pagamentos.",
  btnConfirmReceipt: "✅ Confirmar Recebimento",
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
      `📋 *Resumo de pagamento do Empréstimo*\n\n` +
      `▪️ Capital emprestado: \`${baseAmount.toFixed(2)} ${fiatCode}\`\n` +
      `▪️ Juros fixos (prazo completo): \`${totalInterest.toFixed(2)} ${fiatCode}\`\n` +
      `▪️ Dívida total: \`${totalDebt.toFixed(2)} ${fiatCode}\`\n` +
      `▪️ Valor já pago: \`${amountRepaid.toFixed(2)} ${fiatCode}\`\n` +
      `▪️ **Restante a pagar:** \`${remainingDebt.toFixed(2)} ${fiatCode}\`\n\n` +
      `⚠️ *IMPORTANTE:* Você deve realizar a transferência dos fundos para a sua contraparte **antes** de registrar o pagamento aqui.\n` +
      `🛑 Se você ainda não transferiu o dinheiro, execute /exit para cancelar esta ação e comunique-se com @${lenderUsername} para coordenar.\n\n` +
      `✅ Se você já transferiu a **totalidade do restante** (\`${remainingDebt.toFixed(2)} ${fiatCode}\`), pressione o botão abaixo.\n\n` +
      `🔢 **Você fez um pagamento parcial?**\n` +
      `Escreva agora mesmo neste chat a quantia exata que você já transferiu (apenas números):`
    );
  },
  btnRepayFull: "✅ Paguei o valor total",
  receiptConfirmedBorrower: (loanId: string) =>
    `✅ *Recebimento confirmado*\n\n` +
    `Você confirmou com sucesso o recebimento dos fundos para o empréstimo \`${loanId}\`.\n\n` +
    `O contrato está agora **ATIVO**. Por favor, certifique-se de cumprir com o pagamento nas datas acordadas para recuperar seu colateral.\n\n` +
    `🔍 Você pode usar o comando /loanstatus a qualquer momento para revisar o status, o tempo restante e os detalhes do seu empréstimo.\n\n` +
    `💡 *Dica:* Se precisar, você pode comunicar-se com o credor para fazer **pagamentos parciais** ao longo do prazo; isso ajudará a reduzir sua dívida e evitar a liquidação de sua garantia.`,

  receiptConfirmedLender: (loanId: string) =>
    `✅ *O tomador confirmou o recebimento*\n\n` +
    `A contraparte acabou de confirmar que recebeu o capital do empréstimo \`${loanId}\` em sua conta.\n\n` +
    `O contrato está oficialmente **ATIVO** e o tempo do prazo começou a contar a partir deste momento.\n\n` +
    `🔍 Você pode usar o comando /loanstatus a qualquer momento para monitorar o status, o tempo restante e os detalhes deste empréstimo.\n\n` +
    `💡 *Dica:* Lembre-se de que você pode coordenar diretamente com o tomador para receber **pagamentos parciais** durante a vigência do contrato, caso ambos achem conveniente.`,
  selectRepaidLoan:
    "👇 Selecione o empréstimo para o qual você fez um pagamento (seja parcial ou total):",

  paymentReported: (
    username: string,
    amount: number,
    fiat: string,
    loanId: string,
  ) =>
    `🔔 *Novo relatório de pagamento*\n\nO tomador @${username} indica que enviou um pagamento de *${amount}${fiat}* para o empréstimo \`${loanId}\`.\n\nVocê confirma ter recebido este dinheiro em sua conta?`,
  btnConfirmPayment: "✅ Sim, recebi o pagamento",
  btnRejectPayment: "❌ Não, rejeitar",
  hasPendingPayment: "❌ Você já tem um pagamento pendente de confirmação.",
  paymentPendingConfirmation:
    "✅ Seu relatório de pagamento foi enviado ao credor. Nós o notificaremos quando ele confirmar.",
  borrowerPaymentConfirmed: (amount: number, fiat: string) =>
    `✅ Seu pagamento de ${amount}${fiat} foi confirmado pelo credor.`,
  borrowerPaymentRejected: (amount: number, fiat: string) =>
    `❌ O credor negou o recebimento do seu pagamento de ${amount}${fiat}.`,
  paymentConfirmedAction: (amount: number, fiat: string) =>
    `✅ Você confirmou o recebimento de ${amount}${fiat}.`,
  paymentRejectedAction: "❌ Você rejeitou o pagamento.",
  paymentError: "❌ Erro ao processar o pagamento ou ele já havia sido processado.",
  loanFullyRepaidLender: (loanId: string) =>
    `🎉 *Empréstimo Pago!*\n\nO tomador quitou integralmente a dívida do empréstimo \`${loanId}\`.\nO contrato foi fechado com sucesso.`,

  loanFullyRepaidBorrower: (loanId: string) =>
    `🎉 *Empréstimo Quitado!*\n\nVocê pagou com sucesso o total do empréstimo \`${loanId}\`.\n\nSeu colateral em Bitcoin já está pronto para ser liberado. Execute o seguinte comando para retirá-lo para a sua carteira:\n\n\`/claim ${loanId}\``,
  invalidCommandUsage: (format: string) =>
    `❌ Uso incorreto do comando.\nFormato esperado: \`${format}\``,

  roleBorrower: "Tomador (Você recebe o dinheiro)",
  roleLender: "Credor (Você empresta o dinheiro)",

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
      `📊 *Empréstimo:* \`${params.id}\`\n` +
      `👤 *Seu papel:* ${params.role}\n` +
      `📌 *Status:* \`${params.status}\`\n\n` +
      `📈 *Risco (LTV):* *${params.fLtv}%* _(Liquida em ${params.liquidationLtv}%)_\n\n` +
      `💰 *Dívida (${params.fiatCode}):*\n` +
      `▪️ Capital: ${params.fPrincipal}\n` +
      `▪️ Juros: ${params.fInterest} _(${params.apr}% total)_\n` +
      `▪️ Pago: ${params.fRepaid}\n` +
      `▪️ *Restante:* *${params.fRemaining}*\n\n` +
      `💡 *Precisa abaixar seu LTV?*\n` +
      `1️⃣ *Adicionar colateral:* Deposite BTC em \`${params.escrowAddress}\`. O LTV será atualizado automaticamente após 2 confirmações.\n` +
      `2️⃣ *Pagar dívida:* Contate @${params.borrower} para combinar um pagamento parcial ou total. Depois de feito, use o comando /repaid.`
    );
  },

  liquidationSuccess: (txid: string) =>
    `✅ *Liquidação Concluída com Sucesso*\n\n` +
    `Você resgatou o colateral em Bitcoin devido ao inadimplemento do tomador.\n\n` +
    `🔗 [Ver transação no explorador](${mempoolBaseURL}/tx/${txid})`,

  ltvLiquidatedBorrower: (loanId: string) =>
    `📉 *Colateral Liquidado (Queda de Preço)*\n\n` +
    `O LTV do seu empréstimo \`${loanId}\` ultrapassou o limite de risco de 90% devido à queda no preço do Bitcoin.\n\n` +
    `O contrato passou para o estado de liquidação para proteger o capital do credor. Você deve resgatar os 5% restantes usando /claim.`,

  ltvLiquidatedLender: (loanId: string) =>
    `✅ *Liquidação por LTV Disponível*\n\n` +
    `O LTV do empréstimo \`${loanId}\` ultrapassou o limite crítico de 90%.\n\n` +
    `Você pode executar o comando \`/claim ${loanId}\` para resgatar 95% do colateral em Bitcoin (5% de taxa do protocolo) e garantir seu investimento.`,

  loanExpiredBorrower: (loanId: string) =>
    `⚠️ *Tempo Expirado - Empréstimo Expirado*\n\n` +
    `O período de carência do seu empréstimo \`${loanId}\` expirou sem que os pagamentos correspondentes fossem concluídos.\n\n` +
    `O credor agora tem o direito de cobrar sua dívida. Se a sua garantia superar o valor da dívida, você poderá usar \`/claim ${loanId}\` posteriormente para retirar o excedente.`,

  loanExpiredLender: (loanId: string) =>
    `✅ *Dívida Recuperável Disponível*\n\n` +
    `O tomador não pagou o empréstimo \`${loanId}\` a tempo e o período de carência terminou.\n\n` +
    `Você pode executar o comando \`/claim ${loanId}\` para retirar o capital emprestado junto com os juros correspondentes da garantia.`,

  ltvWarning: (currentLTV: number, liquidationThreshold: number) =>
    `⚠️ *Alerta de Risco de LTV*\n\n` +
    `O LTV do seu empréstimo atual subiu para *${currentLTV.toFixed(2)}%*.\n\n` +
    `Lembre-se de que, se atingir ou ultrapassar o limite de *${liquidationThreshold}%*, seu empréstimo passará automaticamente para o estado de liquidação para proteger o credor. Sugerimos adicionar colateral ou fazer um pagamento parcial. Execute /loanstatus para saber como.`,

  settleBtnLoanRefund: "Reembolso (tomador)",
  settleBtnLoanRelease: "Forçar liberação (tomador)",
  settleBtnLoanLiquidation: "Forçar liquidação (credor)",
  settleBtnLoanActive: "Voltar para Ativo",
  settlePromptLoan: (
    loanId: string,
    lenderHandle: string,
    borrowerHandle: string,
  ) =>
    `⚖️ *Resolver disputa de Empréstimo* \`${loanId}\`\n\n` +
    `👤 Tomador: ${lenderHandle}\n` +
    `👤 Credor: ${borrowerHandle}\n\n` +
    `Selecione uma resolução:`,
  loanDisputeRefunded: (loanId: string) =>
    `✅ *Disputa resolvida (Reembolso)*\n\n` +
    `O administrador resolveu a disputa do empréstimo \`${loanId}\` e autorizou o reembolso.\n\n` +
    `O colateral já está disponível para o tomador retirá-lo integralmente (sem comissão do bot). Use o comando /claim para extrair os fundos.`,

  loanDisputeReleased: (loanId: string) =>
    `✅ *Disputa resolvida (Liberação Forçada)*\n\n` +
    `O administrador resolveu a disputa do empréstimo \`${loanId}\` e forçou a liberação do colateral.\n\n` +
    `O colateral já está disponível para o tomador retirá-lo (será deduzida a taxa de rede do protocolo). Use o comando /claim para extrair os fundos.`,

  loanDisputeRestoredToActive: (loanId: string) =>
    `🔄 *Disputa fechada (Empréstimo ativo novamente)*\n\n` +
    `O administrador fechou a disputa do empréstimo \`${loanId}\` e a retornou para o estado *Ativo*.\n\n` +
    `O empréstimo continua seu curso normal. Por favor, mantenham a comunicação para finalizar o acordo.`,
  loanRepaymentAlreadyPending: (loanId: string) =>
    `⏳ *Pagamento pendente de revisão*\n\n` +
    `Você já reportou um pagamento para o empréstimo \`${loanId}\` e está aguardando confirmação.\n\n` +
    `Por favor, aguarde até que o credor analise e processe seu aviso atual antes de tentar reportar um novo pagamento.`,
};