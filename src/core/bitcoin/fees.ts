import * as bitcoin from "bitcoinjs-lib";
import { BIP32Factory } from "bip32";
import * as ecc from "tiny-secp256k1";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { counters } from "../../db/schema.js";
import { network, getMempoolApiPath } from "./network.js";

const bip32 = BIP32Factory(ecc);

export type MempoolFeesData = {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
};

export async function getNextDerivationIndex(counterName = "fee_derivation_index"): Promise<number> {
  return await db.transaction(async (tx) => {
    const [row] = await tx.select().from(counters).where(eq(counters.name, counterName)).for("update");
    if (!row) {
      await tx.insert(counters).values({ name: counterName, value: 0 });
      return 0;
    }
    const nextIndex = row.value + 1;
    await tx.update(counters).set({ value: nextIndex }).where(eq(counters.name, counterName));
    return nextIndex;
  });
}

export function getBotFeeAddress(index: number): string {
  const xpub = process.env.BOT_FEE_XPUB;
  if (!xpub) throw new Error("La clave extendida del bot no está configurada.");

  const node = bip32.fromBase58(xpub, network);
  const child = node.derive(0).derive(index);
  const { address } = bitcoin.payments.p2wpkh({ pubkey: child.publicKey, network });
  
  return address!;
}

export async function getLiveMinerFee(escrowAddress: string | null, outputCount: number = 1, customUtxosCount?: number): Promise<number> {
  try {
    const feeRes = await fetch(getMempoolApiPath("v1/fees/recommended"));
    const fees = await feeRes.json();
    const feeRate = fees.economyFee;

    let utxoCount = customUtxosCount || 1;
    if (escrowAddress !== null) {
      const utxoRes = await fetch(getMempoolApiPath(`/address/${escrowAddress}/utxo`));
      utxoCount = (await utxoRes.json()).length || 1;
    }

    const estimatedVBytes = 10.5 + (outputCount * 31) + (utxoCount * 104.5);
    return Math.ceil(estimatedVBytes * feeRate);
  } catch (error) {
    return 250; // Fallback
  }
}

export async function getLiveMinerFeeList(): Promise<MempoolFeesData | null> {
  try {
    const feeRes = await fetch(getMempoolApiPath("v1/fees/recommended"));
    const fees = await feeRes.json();
    return fees as MempoolFeesData;
  } catch (error) {
    return null;
  }
}