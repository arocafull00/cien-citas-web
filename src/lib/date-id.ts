const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isCustomDateId(id: string): boolean {
  return UUID_RE.test(id);
}

export function parseCatalogDateId(id: string): number | null {
  if (isCustomDateId(id)) {
    return null;
  }
  const num = parseInt(id, 10);
  if (!Number.isFinite(num)) {
    return null;
  }
  return num;
}
