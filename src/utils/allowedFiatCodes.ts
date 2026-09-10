export interface FiatCodeDetail {
  min: number;
  emoji: string;
}

const fiatCodes: Record<string, FiatCodeDetail> = {
  USD: { min: 50, emoji: "🇺🇸" },
  EUR: { min: 45, emoji: "🇪🇺" },
  GBP: { min: 35, emoji: "🇬🇧" },
  CAD: { min: 70, emoji: "🇨🇦" },
  AUD: { min: 70, emoji: "🇦🇺" },
  CHF: { min: 40, emoji: "🇨🇭" },
  JPY: { min: 7500, emoji: "🇯🇵" },
  BRL: { min: 250, emoji: "🇧🇷" },
  CLP: { min: 45000, emoji: "🇨🇱" },
  COP: { min: 150000, emoji: "🇨🇴" },
  MXN: { min: 850, emoji: "🇲🇽" },
  PEN: { min: 160, emoji: "🇵🇪" },
  ARS: { min: 80000, emoji: "🇦🇷" },
  VES: { min: 45000, emoji: "🇻🇪" },
};

export type SupportedFiat = keyof typeof fiatCodes;

export default fiatCodes;