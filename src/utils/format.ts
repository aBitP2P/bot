export function escapeMarkdown(text: string): string {
  return text.replace(/[_*`\[]/g, "\\$&");
}

export function cleanMD(text: string): string {
  if (!text) return text;
  return text.replace(/([.()\-+=!{}>#])/g, '\\$1');
}