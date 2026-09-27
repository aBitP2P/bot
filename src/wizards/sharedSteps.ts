import { ratesCache } from "../utils/price.js";
import type { Dictionary } from "../types.js";

export async function processFiatCode(text: string, dict: Dictionary): Promise<{ success: boolean; error?: string; fiatCode?: string }> {
  const fiat = text.toUpperCase();
  if (!/^[A-Z]{3}$/.test(fiat)) return { success: false, error: dict.invalidFiatCode };

  try {
    if (!ratesCache.has(fiat)) {
      const res = await fetch(`https://api.yadio.io/rate/${fiat}/BTC`);
      if (!res.ok || !(await res.json()).rate) {
        return { success: false, error: dict.invalidFiatCode };
      }
    }
  } catch (error) {
    return { success: false, error: dict.couldNotFetchPrice };
  }

  return { success: true, fiatCode: fiat };
}

export function processFiatAmount(text: string, dict: Dictionary): { success: boolean; error?: string; amount?: string } {
  if (!text || !/^(\d+([.,]\d{1,2})?)(-(\d+([.,]\d{1,2})?))?$/.test(text)) {
    return { success: false }; 
  }

  const parts = text.split("-");
  const amounts = parts.map((p) => Number(p.replace(",", ".")));

  if (amounts.some((a) => !isFinite(a) || a > Number.MAX_SAFE_INTEGER)) {
    return { success: false, error: dict.fiatValueTooBig };
  }

  const [min, max] = amounts as [number, number?];
  if (max !== undefined) {
    if (min > max) return { success: false }; // Inválido si min es mayor que max
    return { success: true, amount: min === max ? `${min}` : `${min}-${max}` };
  }
  
  return { success: true, amount: `${min}` };
}