export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); this.name = 'ApiError'; }
}
export class NetworkError extends Error {
  constructor() { super('No se pudo conectar con el servidor'); this.name = 'NetworkError'; }
}
export function isNetworkError(error: unknown) {
  return error instanceof NetworkError || (error instanceof TypeError && /fetch|network/i.test(error.message));
}
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (method !== 'GET' && typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new NetworkError();
  }
  let res: Response;
  try {
    res = await fetch(path, {
      method, credentials: 'same-origin', cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch { throw new NetworkError(); }
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'No se pudo completar la operación' }));
    throw new ApiError(error.error || `Error ${res.status}`, res.status);
  }
  return res.json() as Promise<T>;
}
export const apiClient = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
