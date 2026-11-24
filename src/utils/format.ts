export function escapeMarkdown(text: string): string {
  return text.replace(/[\\_*`\[]/g, "\\$&");
}

export function makeStarString(stars: number): string {
  return "⭐".repeat(Math.max(0, Math.floor(stars)));
}

export const formatFiatAmount = (value: string | number): string => {
  const input = String(value).trim();
  if (input === "") return "";

  const format = (raw: string): string => {
    const n = Number(raw.trim().replace(",", "."));
    if (!Number.isFinite(n)) return raw.trim();

    return new Intl.NumberFormat("de-DE", {
      minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(n);
  };

  const rangeMatch = input.match(/^\s*([^-]+?)\s*-\s*([^-]+?)\s*$/);
  if (rangeMatch) {
    return `${format(rangeMatch[1]!)} - ${format(rangeMatch[2]!)}`;
  }

  return format(input);
};
