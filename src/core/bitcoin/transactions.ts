import * as bitcoin from "bitcoinjs-lib";
import { network, getMempoolApiPath } from "./network.js";
import { ECPair, deriveOrderBotKeypair } from "./wallet.js";
import { getLiveMinerFee, getNextDerivationIndex, getBotFeeAddress } from "./fees.js";

const DUST_LIMIT = 546;

export async function checkEscrowFunding(address: string) {
  try {
    const res = await fetch(getMempoolApiPath(`address/${address}/utxo`), { cache: "no-store" });
    if (!res.ok) return null;
    const utxos = await res.json();
    if (utxos.length === 0) return null;

    const totalFundedSats = utxos.reduce((acc: number, utxo: any) => acc + utxo.value, 0);
    const confirmed = utxos.some((utxo: any) => utxo.status.confirmed === true);
    return { totalFundedSats, confirmed, txid: utxos[0].txid };
  } catch (error) {
    return null;
  }
}

export async function broadcastReleaseTx(order: any, buyerWif: string): Promise<string> {
  const buyerKeypair = ECPair.fromWIF(buyerWif, network);
  const escrowBotKeypair = deriveOrderBotKeypair(order.id);

  const utxosRes = await fetch(getMempoolApiPath(`address/${order.escrowAddress}/utxo`));
  const utxos = await utxosRes.json();
  if (!utxos || utxos.length === 0) throw new Error("No hay fondos en el Escrow.");

  const psbt = new bitcoin.Psbt({ network });
  const witnessScript = Uint8Array.from(Buffer.from(order.witnessScript, "hex"));
  const p2wsh = bitcoin.payments.p2wsh({ redeem: { output: witnessScript, network }, network });

  let totalInput = 0;
  for (const utxo of utxos) {
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: { script: p2wsh.output!, value: BigInt(utxo.value) },
      witnessScript: witnessScript,
    });
    totalInput += utxo.value;
  }

  const baseSats = order.amountSats;
  const botFeePercent = parseFloat(process.env.BOT_FEE || "0.8");
  const buyerFee = Math.floor(baseSats * (botFeePercent / 100) / 2);
  const minerFee = await getLiveMinerFee(null, 2, utxos.length);

  const buyerOutput = baseSats - buyerFee - minerFee;
  if (buyerOutput < DUST_LIMIT) throw new Error(`Fondos insuficientes tras comisiones (Neto: ${buyerOutput} sats). Por favor, espere a que baje la congestión de la red.`);

  const botOutput = totalInput - buyerOutput - minerFee;

  psbt.addOutput({ address: order.buyerAddress, value: BigInt(buyerOutput) });
  if (botOutput >= DUST_LIMIT) {
    psbt.addOutput({ address: getBotFeeAddress(await getNextDerivationIndex()), value: BigInt(botOutput) });
  }

  psbt.signAllInputs(buyerKeypair);
  psbt.signAllInputs(escrowBotKeypair);
  psbt.finalizeAllInputs();

  return executeBroadcast(psbt.extractTransaction().toHex());
}

export async function broadcastRefundTx(order: any, sellerWif: string): Promise<string> {
  const sellerKeypair = ECPair.fromWIF(sellerWif, network);
  const escrowBotKeypair = deriveOrderBotKeypair(order.id);

  const utxosRes = await fetch(getMempoolApiPath(`address/${order.escrowAddress}/utxo`));
  const utxos = await utxosRes.json();
  if (!utxos || utxos.length === 0) throw new Error("No hay fondos en el Escrow.");

  const psbt = new bitcoin.Psbt({ network });
  const witnessScript = Uint8Array.from(Buffer.from(order.witnessScript, "hex"));
  const p2wsh = bitcoin.payments.p2wsh({ redeem: { output: witnessScript, network }, network });

  let totalInput = 0;
  for (const utxo of utxos) {
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: { script: p2wsh.output!, value: BigInt(utxo.value) },
      witnessScript: witnessScript,
    });
    totalInput += utxo.value;
  }

  const minerFee = await getLiveMinerFee(null, 1, utxos.length);
  const refundOutput = totalInput - minerFee;
  
  if (refundOutput < DUST_LIMIT) throw new Error("La comisión minera supera el monto disponible en el Escrow.");

  psbt.addOutput({ address: order.refundAddress, value: BigInt(refundOutput) });
  psbt.signAllInputs(sellerKeypair);
  psbt.signAllInputs(escrowBotKeypair);
  psbt.finalizeAllInputs();

  return executeBroadcast(psbt.extractTransaction().toHex());
}

async function executeBroadcast(txHex: string): Promise<string> {
  const res = await fetch(getMempoolApiPath("/tx"), { method: "POST", body: txHex });
  if (!res.ok) throw new Error(`Broadcast falló: ${await res.text()}`);
  return await res.text();
}