export const FEE_TIERS = [
  { maxSats: 100_000, feePercent: 0 },  
  { maxSats: Infinity, feePercent: 0.6 }
];

export function getBotFeePercent(satsAmount: number): number {
  for (const tier of FEE_TIERS) {
    if (satsAmount < tier.maxSats) {
      return tier.feePercent;
    }
  }
  return 0.6;
}

/** Comisión total del bot (ambas partes) en sats. */
export function getBotFeeSats(satsAmount: number): number {
  return Math.floor(satsAmount * (getBotFeePercent(satsAmount) / 100));
}

/** Mitad de la comisión del bot, que paga cada parte, en sats. */
export function getPartyFeeSats(satsAmount: number): number {
  return Math.floor(getBotFeeSats(satsAmount) / 2);
}

/** Total que debe depositar el vendedor en el escrow: monto + su mitad de comisión. */
export function getSellerDepositSats(satsAmount: number): number {
  return satsAmount + getPartyFeeSats(satsAmount);
}

/** Neto que recibe el comprador: monto - su mitad de comisión - comisión minera. */
export function getBuyerNetSats(satsAmount: number, minerFeeSats = 0): number {
  return satsAmount - getPartyFeeSats(satsAmount) - minerFeeSats;
}