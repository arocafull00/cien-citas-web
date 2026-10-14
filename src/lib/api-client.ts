export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); this.name = 'ApiError'; }
}
export class NetworkError extends Error {
  constructor() { super('No se pudo conectar con el servidor'); this.name = 'NetworkError'; }
}
export function isNetworkError(error: unknown) {
  return error instanceof NetworkError || (error instanceof TypeError && /fetch|network/i.test(error.message));
}
const CACHE_TTL = 60_000;
const cachedReads = new Map<string, { value: unknown; expiresAt: number }>();
const pendingReads = new Map<string, Promise<unknown>>();
let cacheGeneration = 0;

// Browser memory only. The session/offline context clears this on user or couple changes.
export function clearApiCache() {
  ++cacheGeneration;
  cachedReads.clear();
  pendingReads.clear();
}
function cacheable(path: string) {
  return typeof window !== 'undefined' && /^\/api\/(account|couples\/me|dates(?:\/[^/?]+)?|profile\/(?:me|achievements))$/.test(path);
}
function get<T>(path: string, options?: { fresh?: boolean }): Promise<T> {
  if (!cacheable(path)) return request<T>('GET', path);
  const cached = cachedReads.get(path);
  if (!options?.fresh && cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.value as T);
  const pending = pendingReads.get(path);
  if (pending) return pending as Promise<T>;
  const generation = cacheGeneration;
  const promise = request<T>('GET', path).then(value => {
    if (generation === cacheGeneration) cachedReads.set(path, { value, expiresAt: Date.now() + CACHE_TTL });
    return value;
  }).finally(() => {
    if (pendingReads.get(path) === promise) pendingReads.delete(path);
  });
  pendingReads.set(path, promise);
  return promise;
}
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (method !== 'GET' && typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new NetworkError();
  }
  // A write may succeed even if its response is lost. Verification must hit the server.
  if (method !== 'GET') clearApiCache();
  let res: Response;
  try {
    res = await fetch(path, {
      method, credentials: 'same-origin', cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch { throw new NetworkError(); }
  if (!res.ok) {
    if ([401, 403].includes(res.status)) clearApiCache();
    const error = await res.json().catch(() => ({ error: 'No se pudo completar la operación' }));
    throw new ApiError(error.error || `Error ${res.status}`, res.status);
  }
  if (method !== 'GET') clearApiCache();
  return res.json() as Promise<T>;
}
export const apiClient = {
  get,
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
