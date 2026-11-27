import * as bitcoin from "bitcoinjs-lib";
import ECPairFactory from "ecpair";
import * as ecc from "tiny-secp256k1";
import { network } from "./network.js";
import { generateMnemonic, mnemonicToSeedSync } from "bip39";
import BIP32Factory, { type BIP32Interface } from "bip32";

export const ECPair = ECPairFactory(ecc);
const bip32 = BIP32Factory(ecc);

export function getAccountPath(): string {
  const coinType = network === bitcoin.networks.bitcoin ? "0'" : "1'";
  return `m/84'/${coinType}/0'`;
}

export function generateWallet() {
  const mnemonic = generateMnemonic(128);
  const seed = mnemonicToSeedSync(mnemonic);
  const master = bip32.fromSeed(seed, network);
  const accountNode = master.derivePath(getAccountPath());

  return {
    mnemonic,
    xpub: accountNode.neutered().toBase58(),
    fingerprint: Buffer.from(master.fingerprint).toString("hex"),
  };
}

export function getMasterBotNode(): BIP32Interface {
  const mnemonic = process.env.BOT_MNEMONIC;
  if (!mnemonic) throw new Error("BOT_MNEMONIC no está configurado.");
  const seed = mnemonicToSeedSync(mnemonic);
  const master = bip32.fromSeed(seed, network);
  return master.derivePath(getAccountPath());
}

export function getBotMultisigXpub(): { xpub: string; fingerprint: string } {
  const seed = mnemonicToSeedSync(process.env.BOT_MNEMONIC!);
  const master = bip32.fromSeed(seed, network);
  const accountNode = master.derivePath(getAccountPath());
  return {
    xpub: accountNode.neutered().toBase58(),
    fingerprint: Buffer.from(master.fingerprint).toString("hex"),
  };
}

export function deriveBotEscrowKeypair(derivationIndex: number) {
  const accountNode = getMasterBotNode();
  const child = accountNode.derive(0).derive(derivationIndex);
  if (!child.privateKey) throw new Error("No se pudo derivar la clave privada del bot.");
  return ECPair.fromPrivateKey(Buffer.from(child.privateKey), { network });
}

export function deriveChildPubkeyFromXpub(accountXpub: string, derivationIndex: number): Buffer {
  const node = bip32.fromBase58(accountXpub, network);
  const child = node.derive(0).derive(derivationIndex);
  return Buffer.from(child.publicKey);
}

export function deriveUserChildKeypair(mnemonic: string, derivationIndex: number) {
  const seed = mnemonicToSeedSync(mnemonic);
  const master = bip32.fromSeed(seed, network);
  const child = master.derivePath(`${getAccountPath()}/0/${derivationIndex}`);
  if (!child.privateKey) throw new Error("No se pudo derivar la clave privada del usuario.");
  return ECPair.fromPrivateKey(Buffer.from(child.privateKey), { network });
}

export function getPairCounterKey(xpubA: string, xpubB: string): string {
  const [first, second] = [xpubA, xpubB].sort();
  return `${first}:${second}`;
}

export function generateOnChainEscrow(
  buyerXpub: string,
  sellerXpub: string,
  derivationIndex: number,
) {
  const botKeypair = deriveBotEscrowKeypair(derivationIndex);
  const buyerPubkey = deriveChildPubkeyFromXpub(buyerXpub, derivationIndex);
  const sellerPubkey = deriveChildPubkeyFromXpub(sellerXpub, derivationIndex);

  const pubkeys = [
    buyerPubkey,
    sellerPubkey,
    Buffer.from(botKeypair.publicKey),
  ].sort((a, b) => a.compare(b));

  const p2ms = bitcoin.payments.p2ms({ m: 2, pubkeys, network });
  const p2wsh = bitcoin.payments.p2wsh({ redeem: p2ms, network });

  return {
    address: p2wsh.address!,
    witnessScript: Buffer.from(p2ms.output!).toString("hex"),
    derivationIndex,
  };
}

export function buildOutputDescriptor(params: {
  buyerXpub: string;
  buyerFingerprint: string;
  sellerXpub: string;
  sellerFingerprint: string;
}): string {
  const path = getAccountPath().replace("m/", "");
  const bot = getBotMultisigXpub();

  const keys = [
    `[${params.buyerFingerprint}/${path}]${params.buyerXpub}/0/*`,
    `[${params.sellerFingerprint}/${path}]${params.sellerXpub}/0/*`,
    `[${bot.fingerprint}/${path}]${bot.xpub}/0/*`,
  ];

  return `wsh(sortedmulti(2,${keys.join(",")}))`;
}

export function isValidAddress(address: string): boolean {
  try {
    bitcoin.address.toOutputScript(address, network);
    return true;
  } catch {
    return false;
  }
}