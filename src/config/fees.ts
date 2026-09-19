export const FEE_TIERS = [
  { maxSats: 100_000, feePercent: 0 },  
  { maxSats: Infinity, feePercent: 0.7 } 
];

export function getBotFeePercent(satsAmount: number): number {
  for (const tier of FEE_TIERS) {
    if (satsAmount < tier.maxSats) {
      return tier.feePercent;
    }
  }
  return 0.7;
}