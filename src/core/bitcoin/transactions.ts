import * as bitcoin from "bitcoinjs-lib";
import { network, getMempoolApiPath } from "./network.js";
import { ECPair, deriveOrderBotKeypair } from "./wallet.js";
import {
  getLiveMinerFee,
  getNextDerivationIndex,
  getBotFeeAddress,
} from "./fees.js";
import type { OrderRecord } from "../../types.js";
import { getBotFeePercent } from "../../config/fees.js";

export const DUST_LIMIT = 546;

async function buildBasePsbt(order: OrderRecord, signerWif: string) {
  const signerKeypair = ECPair.fromWIF(signerWif, network);
  const escrowBotKeypair = deriveOrderBotKeypair(order.id);

  const utxosRes = await fetch(
    getMempoolApiPath(`address/${order.escrowAddress}/utxo`),
  );
  const utxos = await utxosRes.json();
  if (!utxos || utxos.length === 0)
    throw new Error("No hay fondos en el Escrow.");

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
    });
    totalInput += utxo.value;
  }

  return {
    psbt,
    totalInput,
    signerKeypair,
    escrowBotKeypair,
    utxosCount: utxos.length,
  };
}

export async function checkEscrowFunding(
  address: string,
  currentHeight?: number,
  requiredConf: number = 2,
) {
  try {
    const res = await fetch(getMempoolApiPath(`address/${address}/utxo`), {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const utxos = await res.json();
    if (utxos.length === 0) return null;

    let height = currentHeight;
    if (height === undefined) {
      const tipRes = await fetch(getMempoolApiPath("blocks/tip/height"), {
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

    return { totalFundedSats, confirmed, txid: utxos[0].txid };
  } catch (error) {
    return null;
  }
}

export async function broadcastReleaseTx(
  order: OrderRecord,
  buyerWif: string,
  feeRate?: number | null,
): Promise<string> {
  const {
    escrowBotKeypair,
    psbt,
    signerKeypair,
    totalInput,
    utxosCount
  } = await buildBasePsbt(order, buyerWif);

  const baseSats = order.amountSats;
  const botFeePercent = getBotFeePercent(baseSats);
  const buyerFee = Math.floor((baseSats * (botFeePercent / 100)) / 2);

  const botOutputEstimate = totalInput - baseSats + buyerFee;
  const outputCount = botOutputEstimate >= DUST_LIMIT ? 2 : 1;

  const { satsAmount: minerFee } = await getLiveMinerFee({
    escrowAddress: null,
    outputCount: outputCount,
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
      address: getBotFeeAddress(await getNextDerivationIndex()),
      value: BigInt(botOutput),
    });
  }

  psbt.signAllInputs(signerKeypair);
  psbt.signAllInputs(escrowBotKeypair);
  psbt.finalizeAllInputs();

  return executeBroadcast(psbt.extractTransaction().toHex());
}

export async function broadcastRefundTx(
  order: OrderRecord,
  sellerWif: string,
  feeRate?: number | null,
): Promise<string> {
  const { psbt, totalInput, signerKeypair, escrowBotKeypair, utxosCount } =
    await buildBasePsbt(order, sellerWif);

  const { satsAmount: minerFee } = await getLiveMinerFee({
    escrowAddress: null,
    outputCount: 1,
    customUtxosCount: utxosCount,
    customFeeRate: feeRate ?? null,
  });
  const refundOutput = totalInput - minerFee;

  if (refundOutput < DUST_LIMIT)
    throw new Error(
      "La comisión minera supera el monto disponible en el Escrow.",
    );

  psbt.addOutput({ address: order.refundAddress!, value: BigInt(refundOutput) });
  psbt.signAllInputs(signerKeypair);
  psbt.signAllInputs(escrowBotKeypair);
  psbt.finalizeAllInputs();

  return executeBroadcast(psbt.extractTransaction().toHex());
}

async function executeBroadcast(txHex: string): Promise<string> {
  const res = await fetch(getMempoolApiPath("/tx"), {
    method: "POST",
    body: txHex,
  });
  if (!res.ok) throw new Error(`Broadcast falló: ${await res.text()}`);
  return await res.text();
}
