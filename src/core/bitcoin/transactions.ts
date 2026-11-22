import * as bitcoin from "bitcoinjs-lib";
import { network, fetchMempool } from "./network.js";
import { deriveBotEscrowKeypair, deriveUserChildKeypair } from "./wallet.js";
import {
  getLiveMinerFee,
  getNextDerivationIndex,
  getBotFeeAddress,
} from "./fees.js";
import type { OrderRecord } from "../../types.js";
import { getBotFeePercent } from "../../config/fees.js";
import * as ecc from "tiny-secp256k1"
import BIP32Factory from "bip32";
import { getUser } from "../../db/users.js";

export const DUST_LIMIT = 546;
const bip32 = BIP32Factory(ecc);

async function buildBasePsbt(order: OrderRecord) {
  if (order.escrowIndex === null || order.escrowIndex === undefined) {
    throw new Error("La orden no tiene un índice de derivación de escrow asignado.");
  }

  const escrowBotKeypair = deriveBotEscrowKeypair(order.escrowIndex);

  const utxosRes = await fetchMempool(`address/${order.escrowAddress}/utxo`);
  const utxos = await utxosRes.json();
  if (!utxos || utxos.length === 0)
    throw new Error("No hay fondos en el Escrow.");

  const buyerId = order.type === "BUY" ? order.creatorId : order.takerId;
  const sellerId = order.type === "SELL" ? order.creatorId : order.takerId;

  const [buyer, seller] = await Promise.all([getUser(buyerId!), getUser(sellerId!)]);

  const coinType = network === bitcoin.networks.bitcoin ? "0'" : "1'";
  const fullPath = `m/84'/${coinType}/0'/0/${order.escrowIndex}`;

  const bip32Derivation: {
    masterFingerprint: Uint8Array;
    pubkey: Uint8Array;
    path: string;
  }[] = [];

  if (order.buyerXpub && buyer?.fingerprint) {
    const buyerChild = bip32
      .fromBase58(order.buyerXpub, network)
      .derive(0)
      .derive(order.escrowIndex);

    bip32Derivation.push({
      masterFingerprint: Uint8Array.from(Buffer.from(buyer.fingerprint, "hex")),
      pubkey: buyerChild.publicKey,
      path: fullPath,
    });
  }

  if (order.sellerXpub && seller?.fingerprint) {
    const sellerChild = bip32
      .fromBase58(order.sellerXpub, network)
      .derive(0)
      .derive(order.escrowIndex);

    bip32Derivation.push({
      masterFingerprint: Uint8Array.from(Buffer.from(seller.fingerprint, "hex")),
      pubkey: sellerChild.publicKey,
      path: fullPath,
    });
  }

  const psbt = new bitcoin.Psbt({ network });
  const witnessScript = Uint8Array.from(
    Buffer.from(order.witnessScript!, "hex"),
  );
  const p2wsh = bitcoin.payments.p2wsh({
    redeem: { output: witnessScript, network },
    network,
  });

  let totalInput = 0;
  for (const utxo of utxos) {
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: { script: p2wsh.output!, value: BigInt(utxo.value) },
      witnessScript: witnessScript,
      ...(bip32Derivation.length > 0 ? { bip32Derivation } : {}),
    });
    totalInput += utxo.value;
  }

  return {
    psbt,
    totalInput,
    escrowBotKeypair,
    utxosCount: utxos.length,
  };
}
export async function checkEscrowFunding(
  address: string,
  currentHeight?: number,
  requiredConf: number = parseInt(process.env.REQUIRED_CONFIRMATIONS!) || 2,
): Promise<{ totalFundedSats: number, confirmed: boolean, utxoCount: number } | null> {
  try {
    const res = await fetchMempool(`address/${address}/utxo`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const utxos = await res.json();
    
    if (utxos.length === 0) return { totalFundedSats: 0, confirmed: false, utxoCount: 0 };

    let height = currentHeight;
    if (height === undefined) {
      const tipRes = await fetchMempool("blocks/tip/height", {
        cache: "no-store",
      });
      if (!tipRes.ok) return null;
      height = parseInt(await tipRes.text(), 10);
    }

    const totalFundedSats = utxos.reduce(
      (acc: number, utxo: any) => acc + utxo.value,
      0,
    );

    const confirmed = utxos.every((utxo: any) => {
      if (!utxo.status || !utxo.status.confirmed) return false;
      const confs = height - utxo.status.block_height + 1;
      return confs >= requiredConf;
    });

    return { totalFundedSats, confirmed, utxoCount: utxos.length };
  } catch (error) {
    return null;
  }
}

export async function buildReleasePsbt(
  order: OrderRecord,
  feeRate?: number | null,
): Promise<{ psbt: bitcoin.Psbt; escrowBotKeypair: ReturnType<typeof deriveBotEscrowKeypair> }> {
  const { escrowBotKeypair, psbt, totalInput, utxosCount } =
    await buildBasePsbt(order);

  const baseSats = order.amountSats;
  const botFeePercent = getBotFeePercent(baseSats);
  const buyerFee = Math.floor((baseSats * (botFeePercent / 100)) / 2);

  const botOutputEstimate = totalInput - baseSats + buyerFee;
  const outputCount = botOutputEstimate >= DUST_LIMIT ? 2 : 1;

  const { satsAmount: minerFee } = await getLiveMinerFee({
    escrowAddress: null,
    outputCount,
    customUtxosCount: utxosCount,
    customFeeRate: feeRate ?? null,
  });

  const buyerOutput = baseSats - buyerFee - minerFee;
  if (buyerOutput < DUST_LIMIT)
    throw new Error(
      `Fondos insuficientes tras comisiones (Neto: ${buyerOutput} sats). Por favor, espere a que baje la congestión de la red.`,
    );

  const botOutput = totalInput - buyerOutput - minerFee;

  psbt.addOutput({ address: order.buyerAddress!, value: BigInt(buyerOutput) });
  if (botOutput >= DUST_LIMIT) {
    psbt.addOutput({
      address: getBotFeeAddress(await getNextDerivationIndex("fee_derivation_index")),
      value: BigInt(botOutput),
    });
  }

  return { psbt, escrowBotKeypair };
}

export async function broadcastReleaseTx(
  order: OrderRecord,
  signerCredential: { mnemonic?: string; },
  feeRate?: number | null,
): Promise<string> {

  const { psbt, escrowBotKeypair } = await buildReleasePsbt(order, feeRate);
  const userKeypair = deriveUserChildKeypair(signerCredential.mnemonic!, order.escrowIndex!);

  psbt.signAllInputs(userKeypair);
  psbt.signAllInputs(escrowBotKeypair);
  psbt.finalizeAllInputs();

  return executeBroadcast(psbt.extractTransaction().toHex());
}

export async function buildRefundPsbt(
  order: OrderRecord,
  feeRate?: number | null,
): Promise<{ psbt: bitcoin.Psbt; escrowBotKeypair: ReturnType<typeof deriveBotEscrowKeypair> }> {
  const { psbt, totalInput, escrowBotKeypair, utxosCount } =
    await buildBasePsbt(order);

  const { satsAmount: minerFee } = await getLiveMinerFee({
    escrowAddress: null,
    outputCount: 1,
    customUtxosCount: utxosCount,
    customFeeRate: feeRate ?? null,
  });

  const refundOutput = totalInput - minerFee;
  if (refundOutput < DUST_LIMIT)
    throw new Error("La comisión minera supera el monto disponible en el Escrow.");

  psbt.addOutput({ address: order.refundAddress!, value: BigInt(refundOutput) });
  return { psbt, escrowBotKeypair };
}

export async function broadcastRefundTx(
  order: OrderRecord,
  signerCredential: { mnemonic?: string },
  feeRate?: number | null,
): Promise<string> {

  const { psbt, escrowBotKeypair } = await buildRefundPsbt(order, feeRate);
  const userKeypair = deriveUserChildKeypair(signerCredential.mnemonic!, order.escrowIndex!);

  psbt.signAllInputs(userKeypair);
  psbt.signAllInputs(escrowBotKeypair);
  psbt.finalizeAllInputs();

  return executeBroadcast(psbt.extractTransaction().toHex());
}

async function executeBroadcast(txHex: string): Promise<string> {
  const res = await fetchMempool("/tx", {
    method: "POST",
    body: txHex,
  });
  if (!res.ok) throw new Error(`Broadcast falló: ${await res.text()}`);
  return await res.text();
}

export async function findSpendingTxid(
  escrowAddress: string,
): Promise<string | null> {
  try {
    const res = await fetchMempool(`address/${escrowAddress}/txs`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const txs = await res.json();

    const spendingTx = txs.find((tx: any) =>
      tx.vin?.some(
        (input: any) =>
          input.prevout?.scriptpubkey_address === escrowAddress,
      ),
    );

    return spendingTx?.txid ?? null;
  } catch {
    return null;
  }
}