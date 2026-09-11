import * as bitcoin from "bitcoinjs-lib";
import ECPairFactory from "ecpair";
import * as ecc from "tiny-secp256k1";
import crypto from "node:crypto";
import { network } from "./network.js";

export const ECPair = ECPairFactory(ecc);

export function generateWif(): string {
  const keyPair = ECPair.makeRandom({ network });
  return keyPair.toWIF();
}

export function getPubkeyFromWif(wif: string): string {
  try {
    const keyPair = ECPair.fromWIF(wif, network);
    return Buffer.from(keyPair.publicKey).toString("hex");
  } catch (error) {
    throw new Error("El WIF proporcionado no es válido.");
  }
}

export function deriveOrderBotKeypair(orderId: string) {
  const masterBotKeypair = ECPair.fromWIF(process.env.BOT_WIF!, network);
  const tweak = crypto.createHmac("sha256", Buffer.from(masterBotKeypair.privateKey!)).update(orderId).digest();
  const tweakedPrivateKey = ecc.privateAdd(masterBotKeypair.privateKey!, tweak);
  
  if (!tweakedPrivateKey) throw new Error("No se pudo derivar la clave del bot.");
  return ECPair.fromPrivateKey(Buffer.from(tweakedPrivateKey), { network });
}

export function generateEscrow(buyerPubkeyHex: string, sellerPubKeyHex: string, orderId: string) {
  const botKeypairForOrder = deriveOrderBotKeypair(orderId);
  const pubkeys = [
    Buffer.from(buyerPubkeyHex, "hex"),
    Buffer.from(sellerPubKeyHex, "hex"),
    Buffer.from(botKeypairForOrder.publicKey),
  ].sort((a, b) => a.compare(b));

  const p2ms = bitcoin.payments.p2ms({ m: 2, pubkeys, network });
  const p2wsh = bitcoin.payments.p2wsh({ redeem: p2ms, network });

  return { address: p2wsh.address!, witnessScript: Buffer.from(p2ms.output!).toString("hex") };
}

export function isValidAddress(address: string): boolean {
  try {
    bitcoin.address.toOutputScript(address, network);
    return true;
  } catch (error) {
    return false;
  }
}