import * as bitcoin from "bitcoinjs-lib";
import { network, fetchMempool } from "./network.js";
import { ECPair, deriveOrderBotKeypair } from "./wallet.js";
import {
  getLiveMinerFee,
  getNextDerivationIndex,
  getBotFeeAddress,
} from "./fees.js";
import type { LoanRecord, OrderRecord } from "../../types.js";
import { getBotFeePercent } from "../../config/fees.js";
import type { UnifiedContract } from "../../db/contracts.js";
import { LoanStatus } from "../../shared/constants.js";

export const DUST_LIMIT = 546;

async function buildBasePsbt(contract: UnifiedContract, signerWif: string) {
  const signerKeypair = ECPair.fromWIF(signerWif, network);
  const escrowBotKeypair = deriveOrderBotKeypair(contract.data.id);

  const utxosRes = await fetchMempool(
    `address/${contract.data.escrowAddress}/utxo`,
  );
  const utxos = await utxosRes.json();
  if (!utxos || utxos.length === 0)
    throw new Error("No hay fondos en el Escrow.");

  const psbt = new bitcoin.Psbt({ network });
  const witnessScript = Uint8Array.from(
    Buffer.from(contract.data.witnessScript!, "hex"),
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
type FundingData = {
  totalFundedSats: number;
  confirmed: boolean;
  utxoCount: number;
};
export async function checkEscrowFunding(
  address: string,
  currentHeight?: number,
  requiredConf: number = 2,
): Promise<FundingData | null> {
  try {
    const res = await fetchMempool(`address/${address}/utxo`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const utxos = await res.json();

    if (utxos.length === 0)
      return { totalFundedSats: 0, confirmed: false, utxoCount: 0 };

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

export type PayoutAction = "RELEASE" | "REFUND" | "LIQUIDATION";

export async function processContractPayout(
  contract: UnifiedContract,
  signerWif: string,
  action: PayoutAction,
  feeRate?: number | null,
  claimerId?: string | number, 
  claimAddress?: string        
): Promise<string> {
  const { escrowBotKeypair, psbt, signerKeypair, totalInput, utxosCount } =
    await buildBasePsbt(contract, signerWif);

  if (action === "LIQUIDATION") {
    if (!contract.isLoan) throw new Error("La liquidación solo aplica a préstamos.");
    if (!claimerId || !claimAddress) throw new Error("Faltan datos del reclamante y su dirección.");

    const escrow = contract.data.escrowAddress!;
    const baseCol = contract.amountSatsOrCollateral;
    const isLender = claimerId === contract.sellerOrLenderId;

    const isFirstClaim = contract.data.status === LoanStatus.Liquidatable;

    let destinations: { address: string; amount: number; isMain: boolean }[] = [];
    let botFee = 0;

    if (isFirstClaim) {
      // 90% lender, 5% bot, 5% borrower (sobrante)
      const lenderShare = Math.floor(baseCol * 0.90);
      const botShare = Math.floor(baseCol * 0.05);
      const borrowerShare = totalInput - lenderShare - botShare;

      botFee = botShare;

      if (isLender) {
        // Prestamista reclama primero. El 5% vuelve al escrow.
        destinations.push({ address: claimAddress, amount: lenderShare, isMain: true });
        destinations.push({ address: escrow, amount: borrowerShare, isMain: false });
      } else {
        // Prestatario reclama primero. El 90% vuelve al escrow.
        destinations.push({ address: claimAddress, amount: borrowerShare, isMain: true });
        destinations.push({ address: escrow, amount: lenderShare, isMain: false });
      }
    } else {
      // Segundo reclamo, se lleva todo el remanente (100% de lo que quede)
      destinations.push({ address: claimAddress, amount: totalInput, isMain: true });
    }

    const { satsAmount: minerFee } = await getLiveMinerFee({
      escrowAddress: null,
      outputCount: destinations.length + (botFee >= DUST_LIMIT ? 1 : 0),
      customUtxosCount: utxosCount,
      customFeeRate: feeRate ?? null,
    });

    // Descontar la minería solo de la parte de quien está haciendo el reclamo
    const mainDest = destinations.find(d => d.isMain)!;
    mainDest.amount -= minerFee;

    if (mainDest.amount < DUST_LIMIT) {
      throw new Error(`Fondos insuficientes para cubrir la red (${minerFee} sats).`);
    }

    destinations.forEach(d => {
      if (d.amount >= DUST_LIMIT) {
        psbt.addOutput({ address: d.address, value: BigInt(d.amount) });
      }
    });

    if (botFee >= DUST_LIMIT) {
      psbt.addOutput({
        address: getBotFeeAddress(await getNextDerivationIndex()),
        value: BigInt(botFee),
      });
    }

    psbt.signAllInputs(signerKeypair);
    psbt.signAllInputs(escrowBotKeypair);
    psbt.finalizeAllInputs();
    return executeBroadcast(psbt.extractTransaction().toHex());
  }

  // Lógica estándar de Liberación y Reembolso
  const isRelease = action === "RELEASE";
  if (!isRelease && action !== "REFUND") throw new Error("Acción de pago no válida.");

  // Usamos claimAddress si se pasó, si no intentamos sacarlo del contrato
  const destAddress = claimAddress || (isRelease 
    ? (contract.isLoan ? (contract.data as LoanRecord).borrowerAddress : (contract.data as OrderRecord).buyerAddress)
    : (contract.isLoan ? (contract.data as LoanRecord).borrowerAddress : (contract.data as OrderRecord).refundAddress)
  );

  if (!destAddress) throw new Error(`Falta la dirección de destino para la acción ${action}.`);

  let feeSats = 0;
  const applyBotFee = isRelease; // El bot solo cobra en RELEASE
  const baseSats = contract.amountSatsOrCollateral;

  if (applyBotFee) {
    const calcBase = contract.isLoan ? totalInput : baseSats;
    feeSats = Math.floor((calcBase * (getBotFeePercent(calcBase) / 100)) / (contract.isLoan ? 1 : 2));
  }

  const botOutputEstimate = applyBotFee ? (contract.isLoan ? feeSats : totalInput - baseSats + feeSats) : 0;
  const outputCount = (botOutputEstimate >= DUST_LIMIT && applyBotFee) ? 2 : 1;

  const { satsAmount: minerFee } = await getLiveMinerFee({
    escrowAddress: null,
    outputCount,
    customUtxosCount: utxosCount,
    customFeeRate: feeRate ?? null,
  });

  const payoutOutput = applyBotFee 
    ? (contract.isLoan ? totalInput - feeSats - minerFee : baseSats - feeSats - minerFee) 
    : totalInput - minerFee;

  if (payoutOutput < DUST_LIMIT) {
    throw new Error(`Fondos insuficientes tras comisiones (Neto: ${payoutOutput} sats).`);
  }

  psbt.addOutput({ address: destAddress, value: BigInt(payoutOutput) });

  if (applyBotFee) {
    const botOutput = totalInput - payoutOutput - minerFee;
    if (botOutput >= DUST_LIMIT) {
      psbt.addOutput({
        address: getBotFeeAddress(await getNextDerivationIndex()),
        value: BigInt(botOutput),
      });
    }
  }

  psbt.signAllInputs(signerKeypair);
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

export type FundingHealthAction =
  | { type: "CANCEL"; reason: "TRANSACTION_DISAPPEARED" }
  | { type: "REFUND"; reason: "TAMPERING_DETECTED" | "MAX_UTXOS_REACHED" }
  | { type: "NOTIFY_PARTIAL"; remainingSats: number }
  | { type: "MARK_UNCONFIRMED" }
  | { type: "PROCEED"; actualSats: number }
  | { type: "IGNORE" };

interface FundingHealthParams {
  fundingInfo: {
    totalFundedSats: number;
    confirmed: boolean;
    utxoCount: number;
  };
  expectedSats: number;
  isUnconfirmedState: boolean;
  isWaitingState: boolean;
  hasNotifiedPartial: boolean;
}

export function evaluateFundingHealth({
  fundingInfo,
  expectedSats,
  isUnconfirmedState,
  isWaitingState,
  hasNotifiedPartial,
}: FundingHealthParams): FundingHealthAction {
  if (fundingInfo.totalFundedSats < expectedSats) {
    if (isUnconfirmedState) {
      if (fundingInfo.totalFundedSats === 0) {
        return { type: "CANCEL", reason: "TRANSACTION_DISAPPEARED" };
      }
      return { type: "REFUND", reason: "TAMPERING_DETECTED" };
    }

    if (fundingInfo.utxoCount >= 2) {
      return { type: "REFUND", reason: "MAX_UTXOS_REACHED" };
    }

    if (fundingInfo.utxoCount === 1 && !hasNotifiedPartial) {
      return {
        type: "NOTIFY_PARTIAL",
        remainingSats: expectedSats - fundingInfo.totalFundedSats,
      };
    }

    return { type: "IGNORE" };
  }

  if (isWaitingState && !fundingInfo.confirmed) {
    return { type: "MARK_UNCONFIRMED" };
  }

  if (fundingInfo.confirmed) {
    return { type: "PROCEED", actualSats: fundingInfo.totalFundedSats };
  }

  return { type: "IGNORE" };
}
