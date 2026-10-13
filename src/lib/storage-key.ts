/** Compare the normalized URL, so ../ and encoded paths cannot bypass ownership. */
export function storageKey(raw: string, base: string): string | null {
  try {
    const url = new URL(raw), origin = new URL(base);
    const prefix = origin.pathname.replace(/\/$/, '') + '/';
    if (url.origin !== origin.origin || url.search || url.hash || !url.pathname.startsWith(prefix)) return null;
    const key = decodeURIComponent(url.pathname.slice(prefix.length));
    if (!key || key.split('/').some(part => part === '.' || part === '..') || key.includes('\\')) return null;
    return key;
  } catch { return null; }
}
