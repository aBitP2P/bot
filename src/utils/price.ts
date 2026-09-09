export async function getSatsAmount(fiatAmount: number, fiatCode: string, margin: number): Promise<number> {
  try {
    const response = await fetch(`https://api.yadio.io/rate/${fiatCode}/BTC`);
    const data = await response.json();
    
    const btcPrice = data.rate; 
    
    const priceWithMargin = btcPrice * (1 + margin / 100);
    
    const btcAmount = fiatAmount / priceWithMargin;
    const satsAmount = Math.floor(btcAmount * 100_000_000);
    
    return satsAmount;
  } catch (error) {
    console.error('Error fetching price from Yadio:', error);
    throw new Error('No se pudo obtener el precio de mercado.');
  }
}