export const ratesCache = new Map<string, { rate: number; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000;
const MIN_SATS = 60000;

export async function getRateInfoFor(
  fiatAmount: number,
  fiatCode: string,
  margin: number,
): Promise<{
  satsAmount: number,
  appliedRate: number
}> {
  try {
    const now = Date.now();
    let btcPrice: number;

    if (ratesCache.has(fiatCode)) {
      const cached = ratesCache.get(fiatCode)!;
      if (now - cached.timestamp < CACHE_TTL_MS) {
        btcPrice = cached.rate;
      }
    }

    if (!btcPrice!) {
      const response = await fetch(`https://api.yadio.io/rate/${fiatCode}/BTC`);
      if (!response.ok) throw new Error("Error de conexión con Yadio");

      const data = await response.json();
      btcPrice = data.rate;

      ratesCache.set(fiatCode, { rate: btcPrice, timestamp: now });
    }

    const priceWithMargin = btcPrice * (1 + margin / 100);
    const btcAmount = fiatAmount / priceWithMargin;
    const satsAmount = Math.floor(btcAmount * 100_000_000);

    return { satsAmount, appliedRate: priceWithMargin };
  } catch (error) {
    console.error("Error fetching price from Yadio:", error);
    throw new Error("No se pudo obtener el precio de mercado.");
  }
}

export function getMinFiatAmount(btcPrice: number): number {
  const minBtc = MIN_SATS / 100_000_000;
  const minFiat = minBtc * btcPrice;

  return Number(minFiat.toFixed(2));
}