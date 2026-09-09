import type { orders } from "../db/schema.js";
import { mempoolBaseURL } from "../utils/network.js";

type OrderRow = typeof orders.$inferSelect;

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "⏳ Pending",
  WAITING_TAKER_CONFIRMATION: "⏳ Waiting for confirmation",
  WAITING_MAKER_CONFIRMATION: "⏳ Waiting for confirmation",
  WAITING_ESCROW: "📥 Waiting for deposit",
  UNCONFIRMED: "🔄 Confirming on network",
  ACTIVE: "🟢 Active",
  CANCEL_REQUESTED: "⚠️ Cancellation requested",
  FIAT_SENT: "💸 Fiat sent",
  RELEASABLE: "🔓 Ready to release",
  REFUNDABLE: "↩️ Ready to refund",
  DISPUTE: "⚖️ In dispute",
  COMPLETED: "✅ Completed",
  REFUNDED: "↩️ Refunded",
  CANCELLED: "❌ Cancelled",
};

export default {
  welcome:
    "🤖 Welcome to aBitP2P!\n\n⚠️ *IMPORTANT:* Before trading, set up your secure password with /setpass to complete your profile configuration.\n\nUse /help to see the full list of commands and the channel where orders are published ✨",
  telegramUsernameRequired:
    "❌ **Username required**\n\nYou need to set up a Telegram @username to interact with this bot. Go to *Settings > Username*, set it up, and try again.",
  cancelled: "❌ Process cancelled.",
  missingPubkeys:
    "❌ Critical error: Missing public keys to generate the escrow.",
  btnBuyBitcoin: "Buy Bitcoin",
  btnSellBitcoin: "Sell Bitcoin",
  orderPublishedSuccess: (orderId: string) =>
    "✅ *Order successfully published in the channel!*\n" +
    "You can cancel it using `/cancel " +
    orderId +
    "`",
  setYourPersonalPassword:
    "❌ You must first set your password with /setpass to take or create orders.",
  noOrdersFound: "❌ No orders created by you were found.",
  marketPrice: "At market price",
  helpMessage: () =>
    `🤖 *aBitP2P — Help Center*\n\n` +
    `🛒 *Market*\n` +
    `/buy — Buy Bitcoin\n` +
    `/sell — Sell Bitcoin\n` +
    `/listorders — View your active orders\n\n` +
    `⚡️ *Order Management* (Add ID)\n` +
    `/fiatsent — Notify payment sent\n` +
    `/release — Release funds to the buyer\n` +
    `/claim — Claim funds or refund\n` +
    `/cancel — Cancel an order\n` +
    `/dispute — Open dispute with moderation\n` +
    `_Ex: /release ab12cd-34ef56_\n\n` +
    `⚙️ *Account and System*\n` +
    `/setpass — Encrypt your profile with a password\n` +
    `/setlang — Switch language, ex: /setlang ES\n` +
    `/exit — Cancel current action\n\n` +
    `📢 Channel: @aBitP2PExchange\n` +
    `💬 Group: @aBitP2PGeneral\\_es`,
  listOrders: (list: OrderRow[]) => {
    if (list.length === 0) return "📭 You have no registered orders.";

    const blocks = list.map((o) => {
      const typeLabel = o.type === "SELL" ? "🔴 Sell" : "🟢 Buy";
      const statusLabel = ORDER_STATUS_LABELS[o.status] || o.status;
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

      const rows: [string, string][] = [
        ["Order", o.id],
        ["Type", typeLabel],
        ["Fiat", o.fiatCode],
        ["Amount", `${o.amountFiat} ${o.fiatCode}`],
        ["Method", o.paymentMethod],
        ["Margin", marginLabel],
        ["Status", statusLabel],
        ["Created", createdDate],
      ];

      const maxLabel = Math.max(...rows.map(([label]) => label.length));
      const lines = rows.map(
        ([label, value]) => `${label.padEnd(maxLabel)} : ${value}`,
      );

      return "```\n" + lines.join("\n") + "\n```";
    });

    return blocks.join("\n\n");
  },

  buyType: "🟢 Buy",
  sellType: "🔴 Sell",

  actionBuy: "🟢 Buying",
  actionSell: "🔴 Selling",
  payDirectionBuy: "Pay via",
  payDirectionSell: "Receive payment via",

  commandUsage: (usage: string) => `⚠️ *Usage:* \`${usage}\``,

  orderNotFound: `❌ Order not found.`,
  invalidOrderStatus: `❌ You cannot perform this action at the current stage of the order.`,
  waitForBuyerFiatSent: (orderId: string) =>
    "❌ You must notify the buyer to mark the order as paid with `/fiatsent " +
    orderId +
    "`",
  onlyBuyer: `❌ Only the buyer can perform this action.`,
  onlySeller: `❌ Only the seller can authorize this action.`,
  invalidPassword: (retryCommand: string) =>
    `❌ Incorrect password. Please try again with \`${retryCommand}\``,

  promptFiat: "What FIAT currency do you want to use? (Ex: USD, EUR, VES)",
  promptAmount: "Indicate the amount or range (Ex: 50-1000 or 100)",
  promptMargin: "Select the margin using the buttons below 👇",
  promptPaymentMethod: "Type the payment method (Ex: Zelle, Bank Transfer)",

  wizardPreview: (
    type: string,
    fiat: string,
    amount: string,
    margin: string,
    method: string,
    prompt: string,
  ) =>
    `🛠 *Creating Order (${type})*\n\n` +
    "ℹ️ You can use /exit to leave the process\n\n" +
    `💱 FIAT Currency: \`${fiat}\`\n` +
    `📊 Amount / Range: \`${amount}\`\n` +
    `📈 Margin: \`${margin}\`\n` +
    `💳 Payment Method: \`${method}\`\n\n` +
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
    `💵 For ${amountFiat} ${fiat}\n` +
    `💳 ${payDirection} ${method}\n` +
    `🤝 Has ${tradesCount} successful trades\n` +
    `⏳ Using the bot for ${daysUsing} days\n\n` +
    `${hashtag}\n` +
    `📈 Rate: ${margin === 0 ? "At market price" : `yadio.io ${margin > 0 ? "+" + margin : margin}%`}\n` +
    `${rating.toFixed(1)} ${"⭐".repeat(Number(rating.toFixed(0)))} (${tradesCount})\n\n` +
    `\`${id}\``,

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
    `*${type}* Bitcoin\n\n` +
    `💵 Amount: ${amount} ${fiat}\n` +
    `📈 Rate: ${margin === 0 ? "At market price" : `yadio.io ${margin > 0 ? "+" + margin : margin}%`}\n` +
    `💳 Method: ${method}\n\n` +
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
    `💵 Amount: ${amount} ${fiat}\n` +
    `📈 Rate: ${margin === 0 ? "At market price" : `yadio.io ${margin > 0 ? "+" + margin : margin}%`}\n` +
    `💳 Method: ${method}\n\n` +
    `👤 **Counterparty data:**\n` +
    `🤝 Trades: ${trades}\n` +
    `⏳ Antiquity: ${days} days\n` +
    `⭐ Reputation: ${rating.toFixed(1)}/5.0\n\n` +
    `Do you want to confirm and start the trade?\n\n` +
    `ID: \`${id}\``,

  askBuyerAddress:
    "📍 *Please, send your on-chain Bitcoin address* where you will receive the funds.\n_(Make sure it is correct, we are not responsible for mistakes)_",
  promptExactAmount: (range: string, fiat: string) =>
    `This order allows a range of **${range} ${fiat}**.\n\n` +
    `💬 *Please type in the chat the exact amount* you wish to trade for (numbers only):`,

  invalidAmountRange: (min: number, max: number) =>
    `❌ The amount is invalid. It must be a number between **${min}** and **${max}**.\nTry again:`,

  waitMaker:
    "⏳ Perfect. Please, *wait for the counterparty to confirm* if they wish to proceed with the order.",
  waitTaker:
    "⏳ Address saved. Now *wait for the seller to deposit* the funds into the escrow.",
  acceptedNowWaitingEscrow: `✅ *Order accepted.*\n\n⏳ Waiting for the seller to send the funds to the escrow, this may take several minutes...`,

  askSellerEscrow: (sats: number, address: string) =>
    `⚡ *Escrow Funding Required*\n\n` +
    `Please, send \`${sats / 100_000_000}\` BTC to the following on-chain address:\n\n` +
    `\`${address}\`\n\n` +
    `_Once the transaction is confirmed (1 conf), we will put you in contact. Please make sure to send the EXACT amount, otherwise, it might require manual attention._`,

  escrowUnconfirmed: (txid: string) =>
    `⏳ *Transaction detected on the network.*\n\n` +
    `ID: \`${txid}\`\n` +
    `_Waiting for 1 confirmation to notify the counterparty and activate the contract..._`,

  escrowConfirmedBuyer: (sellerContact: string, orderId: string) =>
    `✅ *Escrow Funded and Confirmed!*\n\n` +
    `The funds are secured in the smart contract.\n\n` +
    `🗣 **Contact the seller here:** ${sellerContact}\n\n` +
    `_Instructions: Make the payment via the agreed method. Once the money is transferred, run the command_ \`/fiatsent ${orderId}\` _to notify the seller._`,

  escrowConfirmedSeller: (buyerContact: string, orderId: string) =>
    `✅ *Escrow Funded and Confirmed!*\n\n` +
    `Your funds are secured in the smart contract.\n\n` +
    `🗣 **Contact the buyer here:** ${buyerContact}\n\n` +
    `_Instructions: Wait for the buyer's payment. Once you verify the money is in your account, run the command_ \`/release ${orderId}\` _to release the funds._`,

  releaseSuccessSeller: (orderId: string) =>
    `✅ You have authorized the release of order \`${orderId}\`.\n\n` +
    `The buyer has been notified to sign and claim their Bitcoin. Thank you for using the service!`,

  releaseToBuyer: (orderId: string) =>
    `🎉 *The seller has released the funds!*\n\n` +
    `The escrow is ready to be claimed. Run the following command to start the withdrawal to your wallet:\n\n` +
    `\`/claim ${orderId}\``,

  fiatSentToBuyer: (orderId: string) =>
    `✅ You have marked order \`${orderId}\` as paid.\n\n` +
    `The seller has been notified. Please wait for them to confirm receipt in their account and release the funds.`,

  fiatSentToSeller: (orderId: string, buyerName: string) =>
    `🔔 *Payment reported by the buyer!*\n\n` +
    `${buyerName} indicates they have already sent the FIAT payment to your account.\n\n` +
    `**INSTRUCTIONS:**\n` +
    `1. Check your bank account or agreed payment method.\n` +
    `2. Confirm the amount is correct.\n` +
    `3. If everything is fine, release the Bitcoins by running:\n\n` +
    `\`/release ${orderId}\``,

  askClaimPassword: (
    minerFee: number,
    finalAmount: number,
    receivingAddress: string,
  ) =>
    `🔐 *Claim Funds*\n\n` +
    `**Transaction breakdown:**\n` +
    `├ Address: \`${receivingAddress}\`\n` +
    `├ Miner fee (est): \`-${minerFee / 100_000_000} BTC\`\n` +
    `└ **You will receive approx:** \`${finalAmount / 100_000_000} BTC\`\n\n` +
    `Please, **type your password** to cryptographically sign the withdrawal to your wallet:`,

  unauthorizedAccess: `❌ You do not have permission over this order.`,

  cancelNotAllowed: `❌ You cannot cancel the order in this state. If the payment was already sent, you must open a dispute.`,
  cancelUnconfirmed: `⏳ The order has an unconfirmed transaction on the network. You must wait for 1 confirmation before initiating a cancellation.`,
  cancelAlreadyRequested: `⏳ You have already requested the cancellation. Waiting for your counterparty to accept and sign.`,
  cancelOnlySeller: `❌ Only the seller can cancel the order in this state.`,

  psbtSigningLoading: `⏳ *Co-signing and broadcasting to the network...*`,
  fiatValueBelowMinimun: (fiatCode: string, minValue: number) =>
    `❌ The amount for ${fiatCode} must be at least ${minValue}. Try again:`,

  counterpartyCanceledDeleted: (orderId: string) =>
    `🚫 Your counterparty has cancelled order \`${orderId}\`.`,

  matchCancelledRepublished: (orderId: string) =>
    `🚫 Your counterparty cancelled the agreement for order \`${orderId}\`.\n\nThe order has been republished in the channel so another user can take it.`,

  cancelNotifiedCounterparty: (orderId: string) =>
    `🔔 *Cancellation Request*\n\nYour counterparty has requested to cancel order \`${orderId}\`. If you agree, run \`/cancel ${orderId}\` to confirm and refund the funds to the seller.\n\n` + 
    `⚠️ If you have already made the payment, open a dispute, do not accept the cancellation: \`/dispute ${orderId}\``,

  cancelAccepted: (orderId: string) =>
    `✅ *Cancellation confirmed.*\n\nOrder \`${orderId}\` has been cancelled by mutual agreement. The funds will be refunded to the seller.`,

  cancelAcceptedSeller: (orderId: string) =>
    `✅ *Cancellation confirmed.*\n\nOrder \`${orderId}\` has been cancelled by mutual agreement. You can claim the refund of your funds by running:\n\n\`/claim ${orderId}\``,

  invalidRefundAddress:
    "❌ That Bitcoin address is invalid. Please send it again:",
  invalidBuyerAddress:
    "❌ That Bitcoin address is invalid. Please send a correct address:",

  refundSuccess: (txid: string) =>
    `🎉 *Refund Successful!*\n\nYour funds are on their way back to your wallet.\n🔎 [View TX](${mempoolBaseURL}/tx/${txid})`,

  refundCompletedNotification: (orderId: string) =>
    `ℹ️ *Order Cancelled*\n\nThe seller claimed the refund for order \`${orderId}\`. The escrow funds have been returned.`,

  promptPassword:
    `` +
    `*⚠️ A private key linked to your user will be generated, the password WILL BE REQUIRED to claim the orders.*\n` +
    `*IT CANNOT BE CHANGED, make sure to type it correctly and write it down somewhere.*\n\n` +
    "👀 The aBit team is not responsible for the loss of it.\n\n" +
    "🔑 Please, type your password to configure your user: ",
  passwordAlreadySet: "❌ You already have a previously set password.",
  passwordSetSuccess: `✅ *Password configured successfully.* Profile encrypted and ready to use.\n\n` + 
    "_Keep in mind that it is only for bot usage. The funds you buy will be sent to any address you desire at the moment, the bot does not directly custody the funds at any time._",
  cancelRequestSuccess: `✅ You have requested the cancellation. Waiting for your counterparty to approve it with /cancel.`,
  askRefundAddress: `📍 Please, send the Bitcoin address where you wish to receive your refund:`,
  btnYes: "✅ Yes, continue",
  btnNo: "❌ No, cancel",
  orderCancelled: "🚫 The order has been cancelled or declined.",
  claimSuccess: (txid: string) =>
    `🎉 *Withdrawal Successful!*\n\nThe funds are on their way to your wallet.\n🔎 [View TX](${mempoolBaseURL}/tx/${txid})`,
  errorProcessingTx: (err: string) => `❌ *Network error:*\n\`${err}\``,

  // ─────────────────────────── Disputes ───────────────────────────

  disputeNotAllowed: `❌ You cannot open a dispute in the current state of the order. Disputes only apply to orders with active funds in the escrow.`,
  disputeAlreadyOpen: `⚠️ There is already an open dispute for this order.`,

  disputeOpened: (code: string, orderId: string) =>
    `⚖️ *Your dispute has been opened.*\n\n` +
    `Order: \`${orderId}\`\n\n` +
    `Your verification code is: \`${code}\`\n\n` +
    `This code is *only* to verify the identity of the administrator who takes your dispute.\n\n` +
    `⚠️ *IMPORTANT:* no administrator will write to you before the bot officially notifies you who has taken your dispute. If someone claims to be an administrator before that notification, do not continue the conversation.`,

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
    `Amount: ${amountFiat} ${fiatCode}\n` +
    `Previous state: \`${status}\`\n` +
    `Escrow: \`${escrowAddress}\`\n\n` +
    `👤 Buyer: @${buyerUsername}\n` +
    `👤 Seller: @${sellerUsername}\n\n` +
    `🔑 Buyer verification code: \`${buyerCode}\`\n` +
    `🔑 Seller verification code: \`${sellerCode}\`\n\n` +
    `To take this dispute, run:\n\`/takedispute ${orderId}\``,

  disputeNotFoundOrNotOpen: `❌ This order does not exist or is not currently in dispute.`,
  disputeAlreadyTaken: `⚠️ This dispute was already taken by another administrator.`,
  disputeTakenSuccessAdmin: (orderId: string) =>
    `✅ You have taken the dispute for order \`${orderId}\`. Both parties were notified.\n\nWhen you have a resolution, run:\n\`/settle ${orderId}\``,

  disputeTakenNotification: (
    adminHandle: string,
    code: string,
    orderId: string,
  ) =>
    `⚖️ *Dispute Assigned*\n\n` +
    `The dispute for order \`${orderId}\` has been taken by *${adminHandle}*.\n\n` +
    `Your verification code: \`${code}\`\n\n` +
    `⚠️ No administrator wrote to you before this message. Before sharing any information:\n` +
    `1️⃣ Verify that the username matches the one in this message.\n` +
    `2️⃣ Ask them to tell you your verification code.\n` +
    `3️⃣ The code must match exactly with the one above.\n\n` +
    `The code itself does not give the administrator any permission or modify your dispute.`,

  disputeTakenNotificationNoCode: (adminHandle: string, orderId: string) =>
    `⚖️ *Dispute Assigned*\n\n` +
    `The dispute for order \`${orderId}\` has been taken by *${adminHandle}*.\n\n` +
    `⚠️ No administrator wrote to you before this message. Verify that the username matches exactly with the one above before sharing any information with whoever contacts you.`,

  adminOnlyAction: `❌ Only an authorized administrator can execute this action.`,

  settleNotFoundOrNotInDispute: `❌ This order does not exist or is not in dispute.`,
  settleNotAssignedAdmin: `❌ Only the administrator assigned to this dispute can resolve it.`,
  settleStaleAction: `⚠️ This dispute was already resolved previously. This button is no longer valid.`,

  settlePrompt: (orderId: string, buyerHandle: string, sellerHandle: string) =>
    `⚖️ *Resolve dispute* \`${orderId}\`\n\n` +
    `👤 Buyer: ${buyerHandle}\n` +
    `👤 Seller: ${sellerHandle}\n\n` +
    `Select a resolution:`,

  settleBtnBuyer: (buyerHandle: string) =>
    `✅ In favor of the buyer (${buyerHandle})`,
  settleBtnSeller: (sellerHandle: string) =>
    `✅ In favor of the seller (${sellerHandle})`,
  settleBtnRefund: `↩️ Cancel order / Refund seller`,

  settleResolvedAdmin: (orderId: string, resolution: string) =>
    `✅ Dispute \`${orderId}\` resolved: *${resolution}*.\n\nBoth parties were notified.`,

  settleBuyerWinsNotifyBuyer: (orderId: string) =>
    `⚖️ *Dispute resolved in your favor.*\n\nOrder \`${orderId}\` was resolved in favor of the buyer. You can now claim your funds by running:\n\n\`/claim ${orderId}\``,
  settleBuyerWinsNotifySeller: (orderId: string) =>
    `⚖️ *Dispute resolved.*\n\nOrder \`${orderId}\` was resolved in favor of the buyer. The escrow funds will be released to their address.`,

  settleSellerWinsNotifySeller: (orderId: string) =>
    `⚖️ *Dispute resolved in your favor.*\n\nOrder \`${orderId}\` was resolved in your favor. You can recover your funds by running:\n\n\`/claim ${orderId}\``,
  settleSellerWinsNotifyBuyer: (orderId: string) =>
    `⚖️ *Dispute resolved.*\n\nOrder \`${orderId}\` was resolved in favor of the seller. The escrow funds will be returned to their original owner.`,

  settleCancelledNotifyBuyer: (orderId: string) =>
    `↩️ *Dispute resolved: order cancelled.*\n\nThe administrator determined to cancel order \`${orderId}\`. The funds will be returned to the seller.`,

  settleCancelledNotifySeller: (orderId: string) =>
    `↩️ *Dispute resolved: order cancelled.*\n\nThe administrator determined to cancel order \`${orderId}\`. The funds can be refunded using the command \`/claim ${orderId}\`.`,
  settleResolutionBuyerLabel: "In favor of the buyer",
  settleResolutionSellerLabel: "In favor of the seller",
  settleResolutionRefundLabel: "Cancel / Refund seller",

  invalidLanguage: '❌ Invalid language. The available languages are:\n\n',
  languageUpdateSuccess: '✅ Language updated successfully.'
};