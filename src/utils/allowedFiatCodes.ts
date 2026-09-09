export interface FiatCodeDetail {
  min: number;
}

const fiatCodes: Record<string, FiatCodeDetail> = {
  USD: { min: 50 },
  EUR: { min: 45 },     
  GBP: { min: 35 },     
  CAD: { min: 70 },    
  AUD: { min: 70 },     
  CHF: { min: 40 },     
  JPY: { min: 7500 },   
  BRL: { min: 250 },   
  CLP: { min: 45000 },   
  COP: { min: 150000 },  
  MXN: { min: 850 },   
  PEN: { min: 160 },    
  ARS: { min: 80000 }, 
  VES: { min: 45000 }   
};

export type SupportedFiat = keyof typeof fiatCodes;

export default fiatCodes;