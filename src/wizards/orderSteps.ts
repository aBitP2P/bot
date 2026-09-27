import type { Dictionary } from "../types.js";
import { getRateInfoFor, getMinFiatAmount, MIN_SATS } from "../utils/price.js";

export async function validateOrderMinimumAmount(amountStr: string, fiatCode: string, dict: Dictionary): Promise<{ success: boolean; error?: string }> {
  const minStr = amountStr.split("-")[0]!;
  const min = parseFloat(minStr);
  
  try {
    const rateInfo = await getRateInfoFor(min, fiatCode, 0);
    const minFiatValue = getMinFiatAmount(rateInfo.appliedRate);
    
    if (min < minFiatValue) {
      return { success: false, error: dict.fiatValueBelowMinimun(fiatCode, minFiatValue) };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: dict.couldNotFetchPrice };
  }
}

export async function processOrderMargin(marginStr: string, amountStr: string, fiatCode: string, dict: Dictionary) {
  const margin = parseInt(marginStr, 10);
  const min = parseFloat(amountStr.split("-")[0]!);
  
  try {
    const { satsAmount, appliedRate } = await getRateInfoFor(min, fiatCode, margin);
    if (satsAmount < MIN_SATS) {
      const minFiatRequired = (MIN_SATS / 100_000_000) * appliedRate;
      return { success: false, error: dict.invalidAmountAfterMargin({ margin, minFiatRequired, satsAmount, fiatCode }) };
    }
    return { success: true, margin };
  } catch (error) {
    return { success: false, error: dict.couldNotApplyMargin };
  }
}