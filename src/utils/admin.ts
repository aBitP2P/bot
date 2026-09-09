function parseAdminIds(): Set<number> {
  const raw = process.env.ADMIN_IDS || '';
  const ids = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => parseInt(s, 10))
    .filter((n) => !isNaN(n));

  return new Set(ids);
}

const ADMIN_IDS = parseAdminIds();

export function isAdmin(userId: number): boolean {
  return ADMIN_IDS.has(userId);
}

export function getAdminIds(): number[] {
  return Array.from(ADMIN_IDS);
}
