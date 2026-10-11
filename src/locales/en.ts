import { Strings, OrderStatus, getFiatEmoji } from "../shared/constants.js";
import { mempoolBaseURL, type MempoolFeesData } from "../core/bitcoin/index.js";
import { MIN_SATS } from "../utils/price.js";
import type { LoanDraft } from "../wizards/types.js";
import type { OrderRecord, UserRecord } from "../types.js";
import { escapeMarkdown } from "../utils/format.js";

export const OrderStatusMap: Record<string, string> = {
  [OrderStatus.Pending]: "⏳ Pending",
  [OrderStatus.WaitingTakerConfirmation]: "⏳ Waiting for confirmation",
  [OrderStatus.WaitingMakerConfirmation]: "⏳ Waiting for confirmation",
  [OrderStatus.WaitingEscrow]: "📥 Waiting for deposit",
  [OrderStatus.Unconfirmed]: "🔄 Confirming on the network",
  [OrderStatus.Active]: "🟢 Active",
  [OrderStatus.CancelRequested]: "⚠️ Cancellation requested",
  [OrderStatus.FiatSent]: "💸 Fiat sent",
  [OrderStatus.Releasable]: "🔓 Ready to release",
  [OrderStatus.Refundable]: "↩️ Ready for refund",
  [OrderStatus.Dispute]: "⚖️ In dispute",
  [OrderStatus.Completed]: "✅ Completed",
  [OrderStatus.Refunded]: "↩️ Refunded",
  [OrderStatus.Cancelled]: "❌ Cancelled",
};

export default {
  // ─────────────────────────── General & UI ───────────────────────────
  helpMessage: () =>
    `🤖 *aBitP2P — Help Center*\n\n` +
    `🛒 *Market*\n` +
    `/buy — Buy Bitcoin\n` +
    `/sell — Sell Bitcoin\n` +
    `/listorders — View your active orders\n\n` +
    `⚡️ *Order Management* (Add the ID)\n` +
    `/fiatsent — Notify payment sent\n` +
    `/release — Release funds to buyer\n` +
    `/claim — Claim funds or refund\n` +
    `/cancel — Cancel an order\n` +
    `/dispute — Open dispute with moderation\n` +
    `_Ex: /release ab12cd-34ef56_\n\n` +
    `⚙️ *Account & System*\n` +
    `/setpass — Encrypt your profile with a password\n` +
    `/setlang — Change language\n` +
    "/fees - Check current network fees for your orders\n" +
    "/setfee - Set custom network fee to be used\n" +
    `/exit — Cancel the current action\n\n` +
    `📢 Channel: ${Strings.OrderChannelTag}\n` +
    `💬 Group: ${Strings.GeneralChatTag}`,
  commandUsage: (usage: string, example?: string) =>
    `⚠️ *Usage:* \`${usage}\` ${example ? `💡 \`${example}\`` : ""}`,
  cancelled: "❌ Process cancelled.",
  btnYes: "✅ Yes, continue",
  btnNo: "❌ No, cancel",
  btnBuyBitcoin: "Buy Bitcoin",
  btnSellBitcoin: "Sell Bitcoin",
  actionBuy: "🟢 Buying",
  actionSell: "🔴 Selling",
  buyType: "🟢 Buy",
  sellType: "🔴 Sell",
  payDirectionBuy: "Payment via",
  payDirectionSell: "Receive payment via",
  marketPrice: "At market price",

  // ─────────────────────────── Config & Profile ───────────────────────────
  telegramUsernameRequired:
    "❌ **Username required**\n\nYou need to set a Telegram @username to interact with this bot. Go to *Settings > Username*, configure it, and try again.",
  setYourPersonalPassword:
    "❌ You must first set your password with /setpass to take or create orders.",
  promptPassword:
    `*⚠️ A private key linked to your user will be generated, the password WILL BE REQUIRED to claim orders.*\n` +
    `*IT CANNOT BE CHANGED, make sure to write it correctly and save it in a secure place.*\n\n` +
    "🔑 *Please enter your password to set up your account:*",
  confirmPassword: "👉 To confirm, type your password again: ",
  passwordsDoNotMatch:
    "❌ Passwords do not match. Please try again with /setpass",
  passwordAlreadySet: "❌ You have already set a password.",
  passwordSetSuccess:
    `✅ *Password successfully set.* Profile encrypted and ready to use.\n\n` +
    "_Keep in mind that this password is only used to sign withdrawals on the bot. The funds you acquire will be sent directly to the external address you provide; the bot does not custody your funds._",
  invalidLanguage: "❌ Invalid language.",
  selectLanguage: "👇 Select your preferred language",
  languageUpdateSuccess: "✅ Language updated successfully.",

  // ─────────────────────────── Market & Order Creation ───────────────────────────
  promptFiat: "Which FIAT currency do you want to use? (Ex: USD, EUR, VES)",
  promptAmount: "Enter the amount or range (Ex: 500-1000 or 100)",
  promptMargin: "Select the margin using the buttons below 👇",
  promptPaymentMethod: "Enter the payment method (Ex: Zelle, Bank Transfer)",
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
    `⚠️ *Insufficient amount after applying margin*\n\n` +
    `By applying your ${margin}\% margin, the total to receive dropped to${satsAmount.toLocaleString()} sats.\n\n` +
    `To meet the minimum of ${MIN_SATS.toLocaleString()} sats, you must start the order with at least *$${minFiatRequired.toFixed(2)}${fiatCode}*.\n\n` +
    `🔄 Please restart the order creation process.`,
  wizardPreview: (
    type: string,
    fiat: string,
    amount: string,
    margin: string,
    method: string,
    prompt: string,
  ) =>
    `🛠 *Creating Order (${type})*\n\n` +
    `▪️ Currency: \`${fiat}\`\n` +
    `▪️ Amount/Range: \`${amount}\`\n` +
    `▪️ Margin: \`${margin}\`\n` +
    `▪️ Method: \`${method}\`\n\n` +
    `_Use /exit at any time to cancel_\n\n` +
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
    `For ${amountFiat.split("-").join(" - ")} ${fiat}${getFiatEmoji(fiat)}\n` +
    `💳 ${payDirection}${method}\n` +
    `📈 Rate: ${margin === 0 ? "At market price" : `yadio.io ${margin > 0 ? "+" + margin : margin}%`}\n\n` +
    `👤 **Counterparty:**\n` +
    `▪️ ${tradesCount} successful trades\n` +
    `▪️ Using the bot for ${daysUsing} days\n` +
    `▪️ ${rating.toFixed(1)} ${"⭐".repeat(Math.floor(rating))} (${ratingCount})\n\n` +
    `${hashtag}\n` +
    `\`${id}\``,
  orderPublishedSuccess: (orderId: string) =>
    `✅ *Order published successfully in the channel!*\n` +
    `You can cancel it using \`/cancel ${orderId}\`\n` +
    `👉 ${Strings.OrderChannelTag}`,
  listOrders: (list: OrderRecord[]) => {
    if (list.length === 0) return "📭 You don't have any registered orders.";

    const blocks = list.map((o) => {
      const typeLabel = o.type === "SELL" ? "🔴 Sell" : "🟢 Buy";
      const statusLabel = OrderStatusMap[o.status] || o.status;
      const marginLabel =
        o.margin === 0
          ? "Market price"
          : `${o.margin > 0 ? "+" : ""}${o.margin}%`;
      const createdDate = new Date(o.createdAt).toLocaleString("en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      return (
        `📄 *Order:* \`${o.id}\`\n` +
        `▪️ Type: ${typeLabel}\n` +
        `▪️ Amount: \`${o.fiatAmountLocked ?? o.amountFiat} ${o.fiatCode}\`\n` +
        `▪️ Margin: \`${marginLabel}\`\n` +
        `▪️ Status: ${statusLabel}\n` +
        `▪️ Created: ${createdDate}`
      );
    });

    return blocks.join("\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n");
  },
  orderExpiredCancelled: (orderId: string) =>
    `⌛ *Order expired*\n\nYour order \`${orderId}\` has been published for over 24 hours without being taken. It has been automatically cancelled and removed from the channel.`,

  // ─────────────────────────── Matchmaking & Confirmations ───────────────────────────
  orderTaken: "⚠️ This order has already been taken by someone else.",
  cantTakeOwnOrder: "❌ You cannot take your own order.",
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
    `▪️ Amount: ${amount}${fiat}\n` +
    `▪️ Rate: ${margin === 0 ? "At market price" : `yadio.io ${margin > 0 ? "+" + margin : margin}%`}\n` +
    `▪️ Method: ${method}\n\n` +
    `Are you sure you want to continue?\n\n` +
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
    `Someone wants to take your *${type}* order.\n\n` +
    `▪️ Amount: ${amount}${fiat}\n` +
    `▪️ Rate: ${margin === 0 ? "At market price" : `yadio.io ${margin > 0 ? "+" + margin : margin}%`}\n` +
    `▪️ Method: ${method}\n\n` +
    `👤 **Counterparty Data:**\n` +
    `▪️ Trades: ${trades}\n` +
    `▪️ Account age: ${days} days\n` +
    `▪️ Reputation: ${rating.toFixed(1)}/5.0\n\n` +
    `Do you want to confirm and start the trade?\n\n` +
    `ID: \`${id}\``,
  promptExactAmount: (range: string, fiat: string) =>
    `This order allows a range of **${range}${fiat}**.\n\n` +
    `💬 *Please type the exact amount* in the chat for your trade (numbers only):`,
  askBuyerAddress: (estimatedSats: number) =>
    "📍 *Please send your on-chain Bitcoin address* where you will receive the funds.\n_(Make sure it is correct, we are not responsible for typos)_\n\n" +
    "The estimated amount to receive is: `" +
    estimatedSats / 100_000_000 +
    "` BTC (before network fees).",
  waitMaker:
    "⏳ Great. Please *wait for the counterparty to confirm* if they wish to proceed with the order.",
  waitTaker:
    "⏳ Address saved. Now *wait for the seller to deposit* the funds into the multisig address.",
  acceptedNowWaitingEscrow: `✅ *Order accepted.*\n\n⏳ Waiting for the seller to send the funds to the multisig address, this may take several minutes...`,

  // ─────────────────────────── Escrow & Network ───────────────────────────
  missingPubkeys:
    "❌ Critical error: Missing public keys to generate the multisig address.",
  askSellerEscrow: (sats: number, address: string) =>
    `⚡ *Vault Funding Required*\n\n` +
    `Please send \`${sats / 100_000_000}\` BTC to the following on-chain multisig address:\n\n` +
    `\`${address}\`\n\n` +
    `_Once the transaction is confirmed (2 confirmations), we will put you in contact. Please make sure to send the EXACT amount, otherwise it might require manual attention._`,
  escrowUnconfirmed: (escrowAddress: string) =>
    `⏳ *Transaction detected on the network.*\n\n` +
    `[View in explorer](${mempoolBaseURL}/address/${escrowAddress}) \n` +
    `_Waiting for 2 confirmations to proceed safely with the order..._`,
  escrowFundingFailed: (
    utxoCount: number,
    totalFundedSats: number,
    expectedSats: number,
    orderId: string,
  ) =>
    `❌ *Funding failed*\n\n${utxoCount} deposits have been detected but the amount is still lower than expected (${totalFundedSats / 100_000_000} BTC received out of${expectedSats / 100_000_000} BTC required). The maximum limit is 2 transactions.\n\nThe order has been cancelled. Run \`/claim ${orderId}\` to request a refund of the partial funds sent.`,
  incompleteFunding: (
    totalFundedSats: number,
    expectedSats: number,
    remainingSats: number,
  ) =>
    `⚠️ *Incomplete deposit*\n\nWe detected the arrival of ${totalFundedSats / 100_000_000} BTC, but the order requires${expectedSats / 100_000_000} BTC.\n\nRemaining to deposit: \`${remainingSats / 100_000_000}\` BTC.\n\n_You have 1 additional attempt to send funds. If the second deposit does not complete the required amount, the order will be cancelled and refunded._`,
  fundingExpired:
    "⚠️ Your order has expired because the deposit was not completed in time. Use /claim to refund any partial funds sent to the address.",
  sellerDidNotFund: (orderId: string) =>
    `⚠️ *Seller did not deposit*\n\nThe user who took your order \`${orderId}\` did not complete the deposit in the established time. Your offer has been republished in the channel.`,
  partialDepositCancelled:
    "❌ You have cancelled an order with a partial deposit. Use /claim to request a refund of the funds sent.",
  orderCancelledSellerFunding: `❌ *Order cancelled*\n\nThe seller did not complete the deposit correctly within the allowed attempts. The order has been automatically cancelled and funds will be refunded to their owner.`,
  orderCancelledTransactionDisappeared:
    "❌ *Order cancelled*\n\nThe transaction has disappeared from the network (RBF or dropped from mempool).",
  orderCancelledSellerDepositReverted:
    "❌ *Order cancelled*\n\nThe seller's deposit was reverted or disappeared from the network.",
  tamperingDetected:
    "❌ *Tampering detected*\n\nA partial reversion of the funds on the network was detected. The order has been cancelled. Run /claim to recover the remaining balance.",
  orderCancelledDepositAltered:
    "❌ *Order cancelled*\n\nThe deposit was altered on the network before confirmation. The trade has been aborted for your safety.",
  escrowConfirmedBuyer: (sellerContact: string, orderId: string) =>
    `✅ *Deposit Confirmed!*\n\n` +
    `The funds are secured in the multisig address.\n\n` +
    `🗣 **Contact the seller here:** ${sellerContact}\n\n` +
    `_Instructions: Make the payment using the agreed method. Once the money is transferred, execute the command_ \`/fiatsent ${orderId}\` _to notify the seller._`,
  escrowConfirmedSeller: (buyerContact: string, orderId: string) =>
    `✅ *Deposit Confirmed!*\n\n` +
    `Your funds are secured in the multisig address.\n\n` +
    `🗣 **Contact the buyer here:** ${buyerContact}\n\n` +
    `_Instructions: Wait for the buyer's payment. Once you verify the money is in your account, execute the command_ \`/release ${orderId}\` _to release the funds._`,
  feesList: (
    botFee: string,
    feesData: MempoolFeesData,
    customFee?: number | null,
  ) =>
    "⚡ *Network Fees (Mempool)*\n\n" +
    "┌ ▸ Fast 🚀\n" +
    `│   \`${feesData.fastestFee}\` sat/vB\n` +
    "├ ▸ Medium ⚡\n" +
    `│   \`${feesData.halfHourFee}\` sat/vB\n` +
    "├ ▸ Slow 🐢\n" +
    `│   \`${feesData.hourFee}\` sat/vB\n` +
    "└ ▸ *Economy* ✅ *(default)*\n" +
    `    \`${feesData.economyFee}\` sat/vB\n\n` +
    (customFee
      ? `🎯 *Your Custom Fee* ✅ *(active)*\n   \`${customFee}\` sat/vB\n\n`
      : "") +
    "━━━━━━━━━━━━━━━━━━━━\n\n" +
    "🤖 *Protocol Fee*\n" +
    `   \`${botFee}%\`\n` +
    "   └ Split 50/50 between both parties\n\n" +
    "💡 " +
    (customFee
      ? "You are using your custom network fee instead of the economy one. You can update it anytime with /setfee."
      : "The economy fee is sufficient for the transaction to confirm within the next few hours without overpaying."),
  customFeeChanged: (newFee: number) =>
    `✅ The network fee has been set to ${newFee} sats/vB`,
  couldNotFetchFees: "❌ Could not fetch current fees, please try again later.",
  resetFeeButton: "♻️ Reset to default (Economy)",
  feeResetSuccess: "✅ Your fee has been reset to the default economy setting.",
  errorProcessingTx: (err: string) => `❌ *Network error:*\n\`${err}\``,

  // ─────────────────────────── Fiat & Release ───────────────────────────
  selectReleasableOrder:
    "👇 Select the order you want to release Bitcoin funds for:",
  noReleasableOrdersFound:
    "📭 You don't have any orders pending release.\n\nYou must wait for the buyer to make the payment and confirm it using `/fiatsent`.",
  selectOrderToMarkAsPaid: "👇 Select the order you want to mark as paid:",
  noActiveOrdersFound:
    "📭 You have no active orders pending payment.\n\nYou must wait for the seller to deposit funds into the vault or take a new offer.",
  fiatSentToBuyer: (orderId: string) =>
    `✅ You have marked order \`${orderId}\` as paid.\n\n` +
    `The seller has been notified. Please wait for them to confirm receipt in their account and release the funds.`,
  fiatSentToSeller: (orderId: string, buyerName: string) =>
    `🔔 *Payment reported by the buyer!*\n\n` +
    `${buyerName} indicates they have sent the FIAT payment to your account.\n\n` +
    `**INSTRUCTIONS:**\n` +
    `1. Check your bank account or agreed payment method.\n` +
    `2. Confirm the amount is correct.\n` +
    `3. If everything is fine, release the Bitcoins by executing:\n\n` +
    `\`/release ${orderId}\``,
  askReleaseConfirmation: (buyerName: string) =>
    `⚠️ *Release Confirmation*\n\n` +
    `You are about to release the Bitcoin funds from the vault to @**${buyerName}**.\n\n` +
    `🏦 *Before proceeding, it is strictly necessary that you log into your bank account or wallet and verify yourself that the payment has been properly credited.*\n\n` +
    `_Remember that once released, Bitcoin funds cannot be recovered under any circumstances._\n\n` +
    `Do you want to confirm the final release of the funds?`,
  releaseSuccessSeller: (orderId: string) =>
    `✅ You have authorized the release for order \`${orderId}\`.\n\n` +
    `The buyer has been notified to sign and claim their Bitcoin. Thank you for using our service!`,
  releaseToBuyer: (orderId: string) =>
    `🎉 *The seller has released the funds!*\n\n` +
    `The funds are ready to be claimed. Execute the following command to initiate the withdrawal to your wallet:\n\n` +
    `\`/claim ${orderId}\``,
  rangeOrderPartiallyCompleted: (
    newOrderId: string,
    newAmountFiat: string,
    fiatCode: string,
  ) =>
    `ℹ️ Your range order has been partially completed. A new order (\`${newOrderId}\`) for the remaining balance of *${newAmountFiat} ${fiatCode}* has been republished in${Strings.OrderChannelTag}.`,

  // --------------------------- Rating -----------------------------------
  rateCounterpartyMessage: "👉 Please rate your counterparty:",
  ratingDone: (stars: number) =>
    `⭐ You have rated your counterparty with ${stars} stars.`,

  // ─────────────────────────── Claim & Refund ───────────────────────────
  selectClaimableOrder:
    "👇 Select the order from which you want to claim funds:",
  noClaimableOrdersFound:
    "📭 You don't have any orders ready to withdraw or refund.",
  askClaimPassword: (
    minerFee: number,
    finalAmount: number,
    receivingAddress: string,
    minerFeeRate: number,
  ) =>
    `🔐 *Claim Funds*\n\n` +
    `**Transaction breakdown:**\n` +
    `▪️ Address: \`${receivingAddress}\`\n` +
    `▪️ Miner fee (est): \`-${minerFee / 100_000_000} BTC\` (${minerFeeRate} sats/vB)\n` +
    `▪️ **You will receive approx:** \`${finalAmount / 100_000_000} BTC\`\n\n` +
    `💡 *Note:* If you disagree with the miner fee, you can send /exit to cancel and use /setfee to set your own rate.\n\n` +
    `Please **type your password** to cryptographically sign the withdrawal to your wallet:`,
  psbtSigningLoading: `⏳ *Co-signing and broadcasting to the network...*`,
  claimSuccess: (txid: string) =>
    `🎉 *Withdrawal Successful!*\n\nThe funds are on their way to your wallet.\n🔎 [View TX](${mempoolBaseURL}/tx/${txid})`,
  askRefundAddress: `📍 Please send the Bitcoin address where you wish to receive your refund:`,
  refundSuccess: (txid: string) =>
    `🎉 *Refund Successful!*\n\nYour funds are heading back to your wallet.\n🔎 [View TX](${mempoolBaseURL}/tx/${txid})`,
  refundCompletedNotification: (orderId: string) =>
    `ℹ️ *Order Cancelled*\n\nThe seller claimed the refund for order \`${orderId}\`. The funds were returned to their original address.`,

  // ─────────────────────────── Cancellations ───────────────────────────
  selectOrderToCancel:
    "👉 Select the order you want to cancel, you can see the details with /listorders",
  cancelNotAllowed: `❌ You cannot cancel the order in this state. If the payment has already been sent, you must open a dispute.`,
  cancelUnconfirmed: `⏳ The order has an unconfirmed transaction on the network. You must wait for 2 confirmations before initiating a cancellation.`,
  cancelAlreadyRequested: `⏳ You have already requested a cancellation. Waiting for your counterparty to accept and sign.`,
  cancelOnlySeller: `❌ Only the seller can cancel the order in this state.`,
  cancelAddressWait:
    "❌ You must wait at least 10 minutes after the address is generated before cancelling, to prevent issues with in-transit transactions.",
  counterpartyCanceledDeleted: (orderId: string) =>
    `🚫 Your counterparty has cancelled the order \`${orderId}\`.`,
  matchCancelledRepublished: (orderId: string) =>
    `🚫 Your counterparty cancelled the agreement for order \`${orderId}\`.\n\nThe order has been republished in the channel so another user can take it.`,
  cancelNotifiedCounterparty: (orderId: string) =>
    `🔔 *Cancellation Request*\n\nYour counterparty has requested to cancel order \`${orderId}\`. If you agree, execute \`/cancel ${orderId}\` to confirm and refund the funds to the seller.\n\n` +
    `⚠️ If you have already made the payment, open a dispute, do not accept the cancellation: \`/dispute ${orderId}\``,
  cancelAccepted: (orderId: string) =>
    `✅ *Cancellation confirmed.*\n\nThe order \`${orderId}\` has been cancelled by mutual agreement. The funds will be refunded to the seller.`,
  cancelAcceptedSeller: (orderId: string) =>
    `✅ *Cancellation confirmed.*\n\nThe order \`${orderId}\` has been cancelled by mutual agreement. You can claim your refund by executing:\n\n\`/claim ${orderId}\``,
  cancelRequestSuccess: `✅ You have requested cancellation. Waiting for your counterparty to approve it with /cancel.`,
  orderCancelled: "🚫 The order has been cancelled.",

  // ─────────────────────────── Disputes ───────────────────────────
  disputeNotAllowed: `❌ You cannot open a dispute in the current state of the order. Disputes only apply to orders with active funds in the multisig address.`,
  disputeAlreadyOpen: `⚠️ A dispute is already open for this order.`,
  disputeOpened: (code: string, orderId: string) =>
    `⚖️ *Your dispute has been opened.*\n\n` +
    `Order: \`${orderId}\`\n\n` +
    `Your verification code is: \`${code}\`\n\n` +
    `This code is *solely* to verify the identity of the administrator who takes your dispute.\n\n` +
    `⚠️ *IMPORTANT:* No administrator will write to you before the bot officially notifies you who took your dispute. If someone claims to be an admin before that notification, do not continue the conversation.`,
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
    `⚖️ *NEW DISPUTE*\n\n` +
    `Order: \`${orderId}\`\n` +
    `Type: ${type}\n` +
    `Amount: ${amountFiat}${fiatCode}\n` +
    `Previous state: \`${status}\`\n` +
    `Escrow: \`${escrowAddress}\`\n\n` +
    `👤 Buyer: @${buyerUsername}\n` +
    `👤 Seller: @${sellerUsername}\n\n` +
    `🔑 Buyer verification code: \`${buyerCode}\`\n` +
    `🔑 Seller verification code: \`${sellerCode}\`\n\n` +
    `To take this dispute, execute:\n\`/takedispute ${orderId}\``,
  disputeNotFoundOrNotOpen: `❌ This order does not exist or is not currently in dispute.`,
  disputeAlreadyTaken: `⚠️ This dispute has already been taken by another administrator.`,
  disputeTakenSuccessAdmin: (orderId: string) =>
    `✅ You have taken the dispute for order \`${orderId}\`. Both parties were notified.\n\nWhen you have a resolution, execute:\n\`/settle ${orderId}\``,
  disputeTakenNotification: (
    adminHandle: string,
    code: string,
    orderId: string,
  ) =>
    `⚖️ *Dispute Assigned*\n\n` +
    `The dispute for order \`${orderId}\` has been taken by *${adminHandle}*.\n\n` +
    `Your verification code: \`${code}\`\n\n` +
    `⚠️ No admin wrote to you before this message. Before sharing any information:\n` +
    `1️⃣ Verify the username matches the one in this message.\n` +
    `2️⃣ Ask them to tell you your verification code.\n` +
    `3️⃣ The code must perfectly match the one above.\n\n` +
    `The code alone gives the admin no permissions nor does it modify your dispute.`,
  disputeTakenNotificationNoCode: (adminHandle: string, orderId: string) =>
    `⚖️ *Dispute Assigned*\n\n` +
    `The dispute for order \`${orderId}\` has been taken by *${adminHandle}*.\n\n` +
    `⚠️ No admin wrote to you before this message. Verify that the username exactly matches the one above before sharing any information with whoever contacts you.`,
  adminOnlyAction: `❌ Only an authorized administrator can perform this action.`,
  settleNotFoundOrNotInDispute: `❌ This order does not exist or is not in dispute.`,
  settleNotAssignedAdmin: `❌ Only the administrator assigned to this dispute can resolve it.`,
  settleStaleAction: `⚠️ This dispute was already resolved. This button is no longer valid.`,
  settlePrompt: (orderId: string, buyerHandle: string, sellerHandle: string) =>
    `⚖️ *Resolve dispute* \`${orderId}\`\n\n` +
    `👤 Buyer: ${buyerHandle}\n` +
    `👤 Seller: ${sellerHandle}\n\n` +
    `Select a resolution:`,
  settleBtnBuyer: (buyerHandle: string) =>
    `✅ In favor of buyer (${buyerHandle})`,
  settleBtnSeller: (sellerHandle: string) =>
    `✅ In favor of seller (${sellerHandle})`,
  settleBtnRefund: `↩️ Cancel order / Refund seller`,
  settleResolvedAdmin: (orderId: string, resolution: string) =>
    `✅ Dispute \`${orderId}\` resolved: *${resolution}*.\n\nBoth parties were notified.`,
  settleBuyerWinsNotifyBuyer: (orderId: string) =>
    `⚖️ *Dispute resolved in your favor.*\n\nThe order \`${orderId}\` was resolved in favor of the buyer. You can now claim your funds by executing:\n\n\`/claim ${orderId}\``,
  settleBuyerWinsNotifySeller: (orderId: string) =>
    `⚖️ *Dispute resolved.*\n\nThe order \`${orderId}\` was resolved in favor of the buyer. The funds will be released to their address.`,
  settleSellerWinsNotifySeller: (orderId: string) =>
    `⚖️ *Dispute resolved in your favor.*\n\nThe order \`${orderId}\` was resolved in your favor. You can recover your funds by executing:\n\n\`/claim ${orderId}\``,
  settleSellerWinsNotifyBuyer: (orderId: string) =>
    `⚖️ *Dispute resolved.*\n\nThe order \`${orderId}\` was resolved in favor of the seller. The funds will be returned to their original owner.`,
  settleCancelledNotifyBuyer: (orderId: string) =>
    `↩️ *Dispute resolved: order cancelled.*\n\nThe administrator determined to cancel the order \`${orderId}\`. The funds will be returned to the seller.`,
  settleCancelledNotifySeller: (orderId: string) =>
    `↩️ *Dispute resolved: order cancelled.*\n\nThe administrator determined to cancel the order \`${orderId}\`. The funds can be refunded using the command \`/claim ${orderId}\`.`,
  settleResolutionBuyerLabel: "In favor of buyer",
  settleResolutionSellerLabel: "In favor of seller",
  settleResolutionRefundLabel: "Cancel / Refund seller",

  // ─────────────────────────── Errors & Validations ───────────────────────────
  noOrdersFound: "❌ No orders created by you were found.",
  orderNotFound: `❌ Order not found.`,
  invalidOrderStatus: `❌ You cannot perform this action at the current stage of the order.`,
  waitForBuyerFiatSent: (orderId: string) =>
    "❌ You must notify the buyer to mark the order as paid with `/fiatsent " +
    orderId +
    "`",
  onlyBuyer: `❌ Only the buyer can perform this action.`,
  onlySeller: `❌ Only the seller can authorize this action.`,
  unauthorizedAccess: `❌ You do not have permissions for this order.`,
  invalidPassword: (retryCommand: string) =>
    `❌ Incorrect password. Please try again with \`${retryCommand}\``,
  invalidAmountRange: (min: number, max: number) =>
    `❌ Invalid amount. It must be a number between **${min}** and **${max}**.\nTry again:`,
  fiatValueBelowMinimun: (fiatCode: string, minValue: number) =>
    `❌ The amount for ${fiatCode} must be at least${minValue}. Try again:`,
  fiatValueTooBig: "❌ The amount is too large to be processed by the system.",
  invalidRefundAddress:
    "❌ That Bitcoin address is invalid. Please send it again:",
  invalidBuyerAddress:
    "❌ That Bitcoin address is invalid. Please send a correct address:",
  maxOrdersReached: "❌ You have reached the limit of active orders.",
  invalidFiatCode: "❌ The fiat code was not recognized, try again:",
  orderAlreadyRated: "❌ The counterparty had already been rated.",
  couldNotApplyMargin: "❌ Unknown error when applying margin, try again.",
  couldNotFetchPrice:
    "❌ Unknown error when fetching the currency code, try again:",
  priceApiErrorRepublish:
    "❌ *Connection error calculating price.*\n\nThe agreement was cancelled and the order has been automatically republished in the channel. Please try again later.",
  makerTimeoutNotifyMaker: (orderId: string) =>
    `❌ *Order cancelled due to inactivity*\n\nYour order \`${orderId}\` has been cancelled because you did not confirm the request in time.`,
  makerTimeoutNotifyTaker: (orderId: string) =>
    `❌ *Order cancelled*\n\nThe creator of order \`${orderId}\` did not respond in time. The order has been cancelled.`,
  takerTimeoutNotifyTaker: (orderId: string) =>
    `⏳ *Time expired*\n\nYour time to complete the details of order \`${orderId}\` has expired. The order was republished in the channel; if you still wish to proceed, you will have to take it again.`,
  alreadyHaveActiveOrder:
    "❌ You already have an order in process. You must finish or cancel it before taking another one.",
  invalidCustomFee:
    "❌ The value must be equal to or greater than 0.8, less than 20, and have up to 2 decimals.",

  // ─────────────────────────── Loans ───────────────────────────
  lendType: "🟢 Lending",
  borrowType: "🔴 Borrowing",
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
    `🏦 *Structuring Loan (${type})*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `▪️ Principal: \`${amount} ${fiat}\`\n` +
    `▪️ Guarantee (LTV): \`${ltv}\`\n` +
    `▪️ Annual Rate (APR): \`${apr}\`\n` +
    `▪️ Term: \`${duration} month(s)\`\n` +
    `▪️ Payment method: \`${method}\`\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `_To abort the process type /exit_\n\n` +
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
      `For ${draft.amount} ${draft.fiat}${getFiatEmoji(draft.fiat!)}\n` +
      `💳 Method: ${method}\n` +
      `⏳ Term: ${draft.durationMonths} months\n` +
      `📈 APR (Annual Rate): ${draft.apr}%\n` +
      `🛡️ LTV (Guarantee): ${draft.ltv}%\n\n` +
      `👤 **Counterparty:**\n` +
      `▪️ ${user.tradesCount} successful trades\n` +
      `▪️ Using the bot for ${daysUsing} days\n` +
      `▪️ ${user.rating.toFixed(1)} ${"⭐".repeat(Math.floor(user.rating))} (${user.ratingCount})\n\n` +
      `${hashtag}\n` +
      `\`${loanId}\``
    );
  },
  loanPublishedSuccess: (loanId: string) =>
    `✅ *Your loan offer has been published in the channel.*\nWe will notify you when someone takes it.\n\nID: \`${loanId}\``,
  actionLend: "🟢 Offers to lend",
  actionBorrow: "🔴 Borrowing",
  btnTakeLoanBorrow: "Borrow",
  btnTakeLoanLend: "Lend",
  invalidLoanDuration:
    "❌ The duration must be an integer (or range, ex: 3-6) between 1 and 120 months. Try again:",
  invalidLoanDurationRange: (min: number, max: number) =>
    `❌ The duration must be between ${min} and${max} months. Try again:`,
  promptLoanLTV:
    "🛡️ Select the Loan-to-Value (LTV) 👇\n_Defines how much collateral is required. Ex: With a 50% LTV, a $1,000 loan will require locking $2,000 in Bitcoin as collateral._",
  promptLoanDuration: "Enter the duration of the contract in **months**:",
  promptLoanPaymentMethod:
    "Enter the method to send/receive the FIAT (Ex: Bank Transfer, Zelle, etc.)",
  promptLoanAPR:
    "Enter the Annual Percentage Rate (APR) in percentage (Ex: 5, 8.5, 12):",

  invalidLoanAPR:
    "❌ The APR must be a valid number (greater than 0 and less than 100). You can use decimals. Try again:",
  maxLoansReached: "❌ You have reached the limit of published loan offers.",

  cancelLoanForbidden:
    "❌ You cannot cancel a loan once the FIAT money has been sent or the contract is active. If there is a problem, you must open a dispute using /dispute.",
  loanCancelOnlyBorrower:
    "❌ Only the borrower can cancel the loan in this state.",

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
    `▪️ Principal: ${amount} ${fiat}${getFiatEmoji(fiat)}\n` +
    `▪️ Guarantee (LTV): ${ltv}%\n` +
    `▪️ APR: ${apr}%\n` +
    `▪️ Term: ${duration} months\n` +
    `▪️ Method: ${method}\n\n` +
    `Are you sure you want to take this offer?\n\n` +
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
      `📋 *Final Loan Summary*\n\n` +
      `▪️ Principal: ${amount}${fiat}\n` +
      `▪️ Term: ${duration} months\n` +
      `▪️ Method: ${method}\n\n`;

    if (role === "LENDER") {
      text += `▪️ APR: ${apr}%\n`;
      text += `💰 **To collect at maturity (Approx):** ${totalReturn}${fiat}\n`;
      text += `_(The borrower will deposit BTC collateral to secure your capital)_\n\n`;
    } else {
      text += `▪️ Guarantee (LTV): ${ltv}%\n`;
      text += `▪️ Interest to pay (APR): ${apr}%\n`;
      text += `💰 **Total to repay:** ${totalReturn}${fiat}\n`;
      text += `🔒 Estimated collateral to lock: ${estimatedCollateral} BTC\n\n`;
    }
    text += `Do you want to confirm the terms and notify the counterparty?\n\nID: \`${id}\``;
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
      `Someone has accepted your loan offer and defined the exact terms:\n\n` +
      `▪️ Principal: ${amount}${fiat}\n` +
      `▪️ Term: ${duration} months\n` +
      `▪️ Method: ${method}\n\n`;

    if (role === "LENDER") {
      text += `▪️ APR: ${apr}%\n`;
      text += `💰 **To collect at maturity (Approx):** ${totalReturn}${fiat}\n`;
      text += `_(The borrower will lock ${collateralSats} BTC as guarantee)_\n\n`;
    } else {
      text += `▪️ Guarantee (LTV): ${ltv}%\n`;
      text += `▪️ Interest to pay (APR): ${apr}%\n`;
      text += `💰 **Total to repay:** ${totalReturn}${fiat}\n`;
      text += `🔒 Collateral to lock: ${collateralSats} BTC\n\n`;
    }

    text +=
      `👤 **Counterparty Data:**\n` +
      `▪️ Trades: ${trades}\n` +
      `▪️ Account age: ${days} days\n` +
      `▪️ Reputation: ${rating.toFixed(1)}/5.0\n\n` +
      `Do you want to accept this contract and proceed to vault funding?\n\nID: \`${id}\``;
    return text;
  },
  promptLoanExactAmount: (range: string, fiat: string) =>
    `This loan offer allows a principal range of **${range}${fiat}**.\n\n` +
    `💬 *Type the exact amount* in the chat that you want (numbers only):`,
  promptLoanExactDuration: (range: string) =>
    `This offer allows a term of between **${range} months**.\n\n` +
    `💬 *Type the exact amount of months* you want for this loan in the chat:`,
  waitLoanMaker:
    "⏳ Great. *Wait for the offer creator to confirm* if they wish to proceed with the loan.",
  askBorrowerEscrow: (sats: number, address: string) =>
    `⚡ *Collateral Lock Required*\n\n` +
    `Please send \`${sats / 100_000_000}\` BTC to the following multisig vault address:\n\n` +
    `\`${address}\`\n\n` +
    `_Once the transaction is confirmed (2 confirmations), the lender will be notified to send you the FIAT. Make sure to send the EXACT amount._`,

  waitBorrowerDeposit:
    "⏳ *Loan Accepted.*\n\nNow waiting for the borrower to deposit the collateral Bitcoin into the multisig vault. We will notify you when the funds are secured on the blockchain.",

  loanCollateralSecuredBorrower: (lenderContact: string, loanId: string) =>
    `✅ *Collateral locked and confirmed!* (\`${loanId}\`)\n\n` +
    `Your Bitcoin collateral is secured in the multisig vault.\n\n` +
    `🗣 **Contact the lender here:** ${lenderContact}\n\n` +
    `_The lender has been notified to send you the FIAT principal. We will send you a message when they mark the disbursement as sent._`,

  loanCollateralSecuredLender: (
    borrowerContact: string,
    fiatAmount: number,
    fiatCode: string,
    loanId: string,
  ) =>
    `✅ *Collateral locked and confirmed!*\n\n` +
    `The borrower has successfully secured their Bitcoin in the multisig vault.\n\n` +
    `🗣 **Contact the borrower here:** ${borrowerContact}\n\n` +
    `**INSTRUCTIONS:**\n` +
    `Please proceed to disburse the agreed principal of **${fiatAmount}${fiatCode}** to the borrower via their payment method.\n\n` +
    `Once you send the money, execute this command to start the loan clock:\n` +
    `\`/fiatsent ${loanId}\``,
  loanFiatSentToLender: (loanId: string) =>
    `✅ You have marked the loan disbursement \`${loanId}\` as sent.\n\n` +
    `The borrower has been notified to check their account. The contract will become **ACTIVE** and the timer will start **only** when they confirm receipt of the money.\n\n` +
    `⏳ If the counterparty does not confirm receipt within a reasonable time, you may open a dispute so an administrator can review the case.`,

  loanFiatSentToBorrower: (loanId: string, lenderName: string) =>
    `🔔 *The lender has sent the FIAT!*\n\n` +
    `@${lenderName} indicates they have transferred the principal to your account for loan \`${loanId}\`.\n\n` +
    `Please check your bank account or payment method. Once you verify the funds are available, click the confirmation button below 👇.\n\n` +
    `⚠️ The contract will not change to ACTIVE status until you confirm receipt.\n\n` +
    `⚖️ *Haven't received the money?* If the usual processing time has passed and the funds haven't arrived, you can execute /dispute to open a dispute.`,
  noActiveLoansFound: "❌ No loans found to which you can make payments.",
  btnConfirmReceipt: "✅ Confirm Receipt",
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
      `📋 *Loan Repayment Summary*\n\n` +
      `▪️ Borrowed Principal: \`${baseAmount.toFixed(2)} ${fiatCode}\`\n` +
      `▪️ Fixed Interest (full term): \`${totalInterest.toFixed(2)} ${fiatCode}\`\n` +
      `▪️ Total Debt: \`${totalDebt.toFixed(2)} ${fiatCode}\`\n` +
      `▪️ Amount already paid: \`${amountRepaid.toFixed(2)} ${fiatCode}\`\n` +
      `▪️ **Remaining to pay:** \`${remainingDebt.toFixed(2)} ${fiatCode}\`\n\n` +
      `⚠️ *IMPORTANT:* You must transfer the funds to your counterparty **before** reporting the payment here.\n` +
      `🛑 If you haven't transferred the money yet, execute /exit to cancel this action and contact @${lenderUsername} to coordinate.\n\n` +
      `✅ If you have already transferred the **entire remaining balance** (\`${remainingDebt.toFixed(2)} ${fiatCode}\`), press the button below.\n\n` +
      `🔢 **Did you make a partial payment?**\n` +
      `Type right now in this chat the exact amount you have already transferred to them (numbers only):`
    );
  },
  btnRepayFull: "✅ I paid the full amount",
  receiptConfirmedBorrower: (loanId: string) =>
    `✅ *Receipt confirmed*\n\n` +
    `You have successfully confirmed receipt of the funds for loan \`${loanId}\`.\n\n` +
    `The contract is now **ACTIVE**. Please make sure to meet the repayments on the agreed dates to recover your collateral.\n\n` +
    `🔍 You can use the /loanstatus command at any time to review the status, remaining time, and details of your loan.\n\n` +
    `💡 *Tip:* If needed, you can communicate with the lender to make **partial payments** throughout the term; this will help reduce your debt and avoid the liquidation of your guarantee.`,

  receiptConfirmedLender: (loanId: string) =>
    `✅ *The borrower has confirmed receipt*\n\n` +
    `The counterparty has just confirmed receiving the loan principal \`${loanId}\` in their account.\n\n` +
    `The contract is officially **ACTIVE** and the term clock has started ticking from this moment.\n\n` +
    `🔍 You can use the /loanstatus command at any time to monitor the status, remaining time, and details of this loan.\n\n` +
    `💡 *Tip:* Remember that you can coordinate directly with the borrower to receive **partial payments** during the life of the contract, if both find it convenient.`,
  selectRepaidLoan:
    "👇 Select the loan for which you have made a payment (either partial or full):",

  paymentReported: (
    username: string,
    amount: number,
    fiat: string,
    loanId: string,
  ) =>
    `🔔 *New payment report*\n\nThe borrower @${username} indicates they have sent a payment of *${amount}${fiat}* for loan \`${loanId}\`.\n\nDo you confirm receiving this money in your account?`,
  btnConfirmPayment: "✅ Yes, I received the payment",
  btnRejectPayment: "❌ No, reject",
  hasPendingPayment: "❌ You already have a payment pending confirmation.",
  paymentPendingConfirmation:
    "✅ Your payment report has been sent to the lender. We will notify you when they confirm it.",
  borrowerPaymentConfirmed: (amount: number, fiat: string) =>
    `✅ Your payment of ${amount}${fiat} was confirmed by the lender.`,
  borrowerPaymentRejected: (amount: number, fiat: string) =>
    `❌ The lender has denied receiving your payment of ${amount}${fiat}.`,
  paymentConfirmedAction: (amount: number, fiat: string) =>
    `✅ You have confirmed receiving ${amount}${fiat}.`,
  paymentRejectedAction: "❌ You have rejected the payment.",
  paymentError:
    "❌ Error processing the payment or it had already been processed.",
  loanFullyRepaidLender: (loanId: string) =>
    `🎉 *Loan Repaid!*\n\nThe borrower has completely settled the debt for loan \`${loanId}\`.\nThe contract has been successfully closed.`,

  loanFullyRepaidBorrower: (loanId: string) =>
    `🎉 *Loan Settled!*\n\nYou have successfully paid the total of loan \`${loanId}\`.\n\nYour Bitcoin collateral is now ready to be released. Execute the following command to withdraw it to your wallet:\n\n\`/claim ${loanId}\``,
  invalidCommandUsage: (format: string) =>
    `❌ Incorrect command usage.\nExpected format: \`${format}\``,

  roleBorrower: "Borrower (You receive the money)",
  roleLender: "Lender (You lend the money)",

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
      `📊 *Loan:* \`${params.id}\`\n` +
      `👤 *Your role:* ${params.role}\n` +
      `📌 *Status:* \`${params.status}\`\n\n` +
      `📈 *Risk (LTV):* *${params.fLtv}\%* _(Liquidates at${params.liquidationLtv}%)_\n\n` +
      `💰 *Debt (${params.fiatCode}):*\n` +
      `▪️ Principal: ${params.fPrincipal}\n` +
      `▪️ Interest: ${params.fInterest} _(${params.apr}% total)_\n` +
      `▪️ Paid: ${params.fRepaid}\n` +
      `▪️ *Remaining:* *${params.fRemaining}*\n\n` +
      `💡 *Need to lower your LTV?*\n` +
      `1️⃣ *Add collateral:* Deposit BTC to \`${params.escrowAddress}\`. The LTV will automatically update after 2 confirmations.\n` +
      `2️⃣ *Pay debt:* Contact @${params.borrower} to agree on a partial or full payment. Once done, use the /repaid command.`
    );
  },

  liquidationSuccess: (txid: string) =>
    `✅ *Liquidation Successfully Completed*\n\n` +
    `You have claimed the Bitcoin collateral due to the borrower's default.\n\n` +
    `🔗 [View transaction in explorer](${mempoolBaseURL}/tx/${txid})`,

  ltvLiquidatedBorrower: (loanId: string) =>
    `📉 *Collateral Liquidated (Price Drop)*\n\n` +
    `The LTV of your loan \`${loanId}\` exceeded the risk limit of 90% due to the drop in the price of Bitcoin.\n\n` +
    `The contract has moved to a liquidated state to protect the lender's capital. You should claim the remaining 5% using /claim.`,

  ltvLiquidatedLender: (loanId: string) =>
    `✅ *Liquidation due to LTV Available*\n\n` +
    `The LTV of loan \`${loanId}\` exceeded the critical limit of 90%.\n\n` +
    `You can execute the command \`/claim ${loanId}\` to claim 95% of the Bitcoin collateral (5% protocol fee) and secure your investment.`,

  loanExpiredBorrower: (loanId: string) =>
    `⚠️ *Time Expired - Loan Expired*\n\n` +
    `The grace period of your loan \`${loanId}\` has expired without the corresponding payments being completed.\n\n` +
    `The lender now has the right to collect their debt. If your guarantee exceeded the value of the debt, you may use \`/claim ${loanId}\` later to withdraw the surplus.`,

  loanExpiredLender: (loanId: string) =>
    `✅ *Recoverable Debt Available*\n\n` +
    `The borrower did not pay loan \`${loanId}\` on time and the grace period has ended.\n\n` +
    `You can execute the command \`/claim ${loanId}\` to withdraw the lent capital along with the corresponding interest from the guarantee.`,

  ltvWarning: (currentLTV: number, liquidationThreshold: number) =>
    `⚠️ *LTV Risk Alert*\n\n` +
    `The LTV of your current loan has risen to *${currentLTV.toFixed(2)}%*.\n\n` +
    `Remember that if it reaches or exceeds the limit of *${liquidationThreshold}%*, your loan will automatically go into liquidation status to protect the lender. We suggest adding collateral or making a partial payment. Execute /loanstatus to find out how.`,

  settleBtnLoanRefund: "Refund (borrower)",
  settleBtnLoanRelease: "Force release (borrower)",
  settleBtnLoanLiquidation: "Force liquidation (lender)",
  settleBtnLoanActive: "Return to Active",
  settlePromptLoan: (
    loanId: string,
    lenderHandle: string,
    borrowerHandle: string,
  ) =>
    `⚖️ *Resolve Loan dispute* \`${loanId}\`\n\n` +
    `👤 Borrower: ${lenderHandle}\n` +
    `👤 Lender: ${borrowerHandle}\n\n` +
    `Select a resolution:`,
  loanDisputeRefunded: (loanId: string) =>
    `✅ *Dispute resolved (Refund)*\n\n` +
    `The administrator has resolved the dispute for loan \`${loanId}\` and authorized a refund.\n\n` +
    `The collateral is now available for the borrower to withdraw in full (without bot commission). Use the /claim command to extract the funds.`,

  loanDisputeReleased: (loanId: string) =>
    `✅ *Dispute resolved (Forced Release)*\n\n` +
    `The administrator has resolved the dispute for loan \`${loanId}\` and forced the release of the collateral.\n\n` +
    `The collateral is now available for the borrower to withdraw (the protocol's network fee will be deducted). Use the /claim command to extract the funds.`,

  loanDisputeRestoredToActive: (loanId: string) =>
    `🔄 *Dispute closed (Loan active again)*\n\n` +
    `The administrator has closed the dispute for loan \`${loanId}\` and returned it to the *Active* state.\n\n` +
    `The loan continues its normal course. Please maintain communication to finalize the agreement.`,
  loanRepaymentAlreadyPending: (loanId: string) =>
    `⏳ *Payment pending review*\n\n` +
    `You have already reported a payment for loan \`${loanId}\` and it is waiting for confirmation.\n\n` +
    `Please wait for the lender to review and process your current notice before attempting to report a new payment.`,
};
