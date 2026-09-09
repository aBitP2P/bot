import * as bitcoin from "bitcoinjs-lib"
import ECPairFactory from "ecpair"
import * as ecc from "tiny-secp256k1"
import crypto from "node:crypto"
import { network, mempoolBaseURL, getMempoolApiPath } from "./network.js";
import { getBotFeeAddress, getNextDerivationIndex } from "./botFee.js";

export const ECPair = ECPairFactory(ecc);
export { network, mempoolBaseURL, getMempoolApiPath };

// Deriva una clave del bot ÚNICA POR ORDEN a partir de BOT_WIF + orderId (HMAC-SHA256
// como tweak, misma técnica que la derivación de hijos en BIP32). Determinista: el
// bot siempre puede recalcular la misma clave a partir del orderId, sin guardar nada
// nuevo en la DB. Esto evita que dos órdenes entre la MISMA pareja comprador/vendedor
// generen la MISMA dirección de escrow
export function deriveOrderBotKeypair(orderId: string) {
  const masterBotKeypair = ECPair.fromWIF(process.env.BOT_WIF!, network);

  const tweak = crypto.createHmac('sha256', Buffer.from(masterBotKeypair.privateKey!))
    .update(orderId)
    .digest();

  const tweakedPrivateKey = ecc.privateAdd(masterBotKeypair.privateKey!, tweak);
  if (!tweakedPrivateKey) throw new Error('No se pudo derivar la clave del bot para esta orden.');

  return ECPair.fromPrivateKey(Buffer.from(tweakedPrivateKey), { network });
}

export function generateEscrow(buyerPubkeyHex: string, sellerPubKeyHex: string, orderId: string) {
  const botKeypairForOrder = deriveOrderBotKeypair(orderId);

  const pubkeys = [
    Buffer.from(buyerPubkeyHex, 'hex'),
    Buffer.from(sellerPubKeyHex, 'hex'),
    Buffer.from(botKeypairForOrder.publicKey)
  ];

  pubkeys.sort((a, b) => a.compare(b));

  const p2ms = bitcoin.payments.p2ms({ m: 2, pubkeys, network });
  const p2wsh = bitcoin.payments.p2wsh({ redeem: p2ms, network });

  return {
    address: p2wsh.address!,
    witnessScript: Buffer.from(p2ms.output!).toString('hex')
  }
}

export async function getLiveMinerFee(escrowAddress: string): Promise<number> {
  try {
    const feeRes = await fetch(getMempoolApiPath('v1/fees/recommended'));
    const fees = await feeRes.json();
    const feeRate = fees.economyFee;

    const utxoRes = await fetch(getMempoolApiPath(`/address/${escrowAddress}/utxo`));
    const utxos = await utxoRes.json();
    const utxoCount = utxos.length || 1;

    const estimatedVBytes = 10.5 + 31 + (utxoCount * 104.5);

    return Math.ceil(estimatedVBytes * feeRate);
  } catch (error) {
    console.error("Error calculando fee en vivo:", error);
    return 500; // Fallback de seguridad en caso de que la API falle
  }
}

export async function checkEscrowFunding(address: string) {
  try {
    const res = await fetch(getMempoolApiPath(`address/${address}/utxo`), {
      cache: 'no-store'
    });
    if (!res.ok) return null;
    
    const utxos = await res.json();
    if (utxos.length === 0) return null;

    const totalFundedSats = utxos.reduce((acc: number, utxo: any) => acc + utxo.value, 0);
    const confirmed = utxos.some((utxo: any) => utxo.status.confirmed === true);
    const txid = utxos[0].txid;

    return { totalFundedSats, confirmed, txid };
  } catch (error) {
    console.error("Error consultando mempool:", error);
    return null;
  }
}

export function isValidAddress(address: string): boolean {
  try {
    bitcoin.address.toOutputScript(address, network);
    return true;
  } catch (error) {
    return false;
  }
}

export function generateWif(): string {
  const keyPair = ECPair.makeRandom({ network }); 
  return keyPair.toWIF();
}

export function getPubkeyFromWif(wif: string): string {
  try {
    const keyPair = ECPair.fromWIF(wif, network);
    return Buffer.from(keyPair.publicKey).toString('hex');
  } catch (error) {
    console.error("Error al extraer la llave pública:", error);
    throw new Error("El WIF proporcionado no es válido.");
  }
}

export async function broadcastReleaseTx(order: any, buyerWif: string): Promise<string> {
  const buyerKeypair = ECPair.fromWIF(buyerWif, network);
  const escrowBotKeypair = deriveOrderBotKeypair(order.id);

  const utxosRes = await fetch(getMempoolApiPath(`address/${order.escrowAddress}/utxo`));
  const utxos = await utxosRes.json();
  if (!utxos || utxos.length === 0) throw new Error('No hay fondos en el Escrow.');

  const psbt = new bitcoin.Psbt({ network });
  const witnessScriptBuffer = Buffer.from(order.witnessScript, 'hex');
  const witnessScript = Uint8Array.from(witnessScriptBuffer);
  const p2wsh = bitcoin.payments.p2wsh({ redeem: { output: witnessScript, network }, network });

  let totalInput = 0;
  for (const utxo of utxos) {
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        script: p2wsh.output!,
        value: BigInt(utxo.value),
      },
      witnessScript: witnessScript,
    });
    totalInput += utxo.value;
  }

  const baseSats = order.amountSats;
  const botFeePercent = parseFloat(process.env.BOT_FEE || '0.8');
  const totalBotFee = Math.floor(baseSats * (botFeePercent / 100));
  const buyerFee = Math.floor(totalBotFee / 2);

  const feeRateRes = await fetch(getMempoolApiPath('v1/fees/recommended'));
  const fees = await feeRateRes.json();
  const estimatedVBytes = 10.5 + 31 + (utxos.length * 104.5);
  const minerFee = Math.ceil(estimatedVBytes * fees.hourFee);

  const buyerOutput = baseSats - buyerFee - minerFee;
  if (buyerOutput <= 0) throw new Error('Las comisiones superan el monto.');

  const botOutput = totalInput - buyerOutput - minerFee;
  if (botOutput <= 0) throw new Error('No hay fondos suficientes para cubrir la comisión del bot.');

  const buyerDest = order.buyerAddress;
  const i = await getNextDerivationIndex();
  const botDest = getBotFeeAddress(i);

  psbt.addOutput({ address: buyerDest, value: BigInt(buyerOutput) });
  psbt.addOutput({ address: botDest, value: BigInt(botOutput) });

  psbt.signAllInputs(buyerKeypair);
  psbt.signAllInputs(escrowBotKeypair);

  psbt.finalizeAllInputs();
  const txHex = psbt.extractTransaction().toHex();

  const broadcastRes = await fetch(getMempoolApiPath('/tx'), {
    method: 'POST',
    body: txHex
  });

  if (!broadcastRes.ok) {
    const errorText = await broadcastRes.text();
    throw new Error(`Broadcast falló: ${errorText}`);
  }

  // TXID
  return await broadcastRes.text(); 
}

// Reembolso de cancelación: firma el bot + el vendedor (no requiere al comprador).
// Devuelve la totalidad de lo depositado en el escrow, descontando únicamente la fee de minería
// (sin cobrar la comisión del bot, ya que la operación no se completó).
export async function broadcastRefundTx(order: any, sellerWif: string): Promise<string> {
  const sellerKeypair = ECPair.fromWIF(sellerWif, network);
  const escrowBotKeypair = deriveOrderBotKeypair(order.id);

  const utxosRes = await fetch(getMempoolApiPath(`address/${order.escrowAddress}/utxo`));
  const utxos = await utxosRes.json();
  if (!utxos || utxos.length === 0) throw new Error('No hay fondos en el Escrow.');

  const psbt = new bitcoin.Psbt({ network });
  const witnessScriptBuffer = Buffer.from(order.witnessScript, 'hex');
  const witnessScript = Uint8Array.from(witnessScriptBuffer);
  const p2wsh = bitcoin.payments.p2wsh({ redeem: { output: witnessScript, network }, network });

  let totalInput = 0;
  for (const utxo of utxos) {
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        script: p2wsh.output!,
        value: BigInt(utxo.value),
      },
      witnessScript: witnessScript,
    });
    totalInput += utxo.value;
  }

  const feeRateRes = await fetch(getMempoolApiPath('/v1/fees/recommended'));
  const fees = await feeRateRes.json();
  const estimatedVBytes = 10.5 + 31 + (utxos.length * 104.5); // 1 sola salida
  const minerFee = Math.ceil(estimatedVBytes * fees.hourFee);

  const refundOutput = totalInput - minerFee;
  if (refundOutput <= 0) throw new Error('La comisión minera supera el monto disponible en el Escrow.');

  psbt.addOutput({ address: order.refundAddress, value: BigInt(refundOutput) });

  psbt.signAllInputs(sellerKeypair);
  psbt.signAllInputs(escrowBotKeypair);

  psbt.finalizeAllInputs();
  const txHex = psbt.extractTransaction().toHex();

  const broadcastRes = await fetch(getMempoolApiPath('tx'), {
    method: 'POST',
    body: txHex
  });

  if (!broadcastRes.ok) {
    const errorText = await broadcastRes.text();
    throw new Error(`Broadcast falló: ${errorText}`);
  }

  return await broadcastRes.text();
}