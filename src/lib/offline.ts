import { openDB } from 'idb';
import type { Snapshot } from './types';
import { clearApiCache } from './api-client';

export const OFFLINE_DB = '100citas-offline-v1';
const PHOTO_PREFIX = '100citas-photos-v1-';
const MAX_PHOTOS = 100;
const PHOTO_AGE = 30 * 24 * 60 * 60 * 1000;
const MAX_PHOTO_URLS = 150;
const photoUrls = new Map<string, string>();
const pendingPhotoUrls = new Map<string, Promise<string>>();
let generation = 0;
export const currentGeneration = () => generation;
export const beginContext = () => {
  clearApiCache();
  photoUrls.forEach((url) => URL.revokeObjectURL(url));
  photoUrls.clear();
  pendingPhotoUrls.clear();
  return ++generation;
};
export const snapshotKey = (snapshot: Pick<Snapshot, 'account' | 'couple'>) =>
  `${snapshot.account.clerkUserId}:${snapshot.couple.id}`;
const database = () =>
  openDB(OFFLINE_DB, 1, {
    upgrade(db) {
      db.createObjectStore('snapshots');
      db.createObjectStore('meta');
    },
  });

export async function saveSnapshot(snapshot: Snapshot, expectedGeneration: number) {
  const db = await database();
  if (generation !== expectedGeneration) return;
  const tx = db.transaction(['snapshots', 'meta'], 'readwrite');
  const key = snapshotKey(snapshot);
  await Promise.all([
    tx.objectStore('snapshots').put(snapshot, key),
    tx.objectStore('meta').put(key, 'active'),
  ]);
  await tx.done;
}
export async function readSnapshot(userId?: string, coupleId?: string): Promise<Snapshot | null> {
  const db = await database();
  const active = (await db.get('meta', 'active')) as string | undefined;
  if (!active) return null;
  const value = (await db.get('snapshots', active)) as Snapshot | undefined;
  if (
    !value ||
    (userId && value.account.clerkUserId !== userId) ||
    (coupleId && value.couple.id !== coupleId)
  )
    return null;
  return value;
}
export async function clearPrivateData(options: { preserveProfileSetup?: boolean } = {}) {
  beginContext();
  const db = await database();
  const tx = db.transaction(['snapshots', 'meta'], 'readwrite');
  await Promise.all([tx.objectStore('snapshots').clear(), tx.objectStore('meta').clear()]);
  await tx.done;
  if ('caches' in globalThis)
    await Promise.all(
      (await caches.keys()).filter((k) => k.startsWith(PHOTO_PREFIX)).map((k) => caches.delete(k)),
    );
  if (typeof window !== 'undefined') {
    if (!options.preserveProfileSetup)
      Object.keys(localStorage)
        .filter((k) => k.startsWith('100citas:profile:'))
        .forEach((k) => localStorage.removeItem(k));
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith('100citas:feed:'))
      .forEach((k) => sessionStorage.removeItem(k));
  }
}

export async function loadPhoto(
  url: string,
  scope: string,
  expectedGeneration: number,
  variant: 'original' | 'thumbnail' = 'original',
): Promise<Blob> {
  const originalUrl = `/api/media?url=${encodeURIComponent(url)}`;
  const thumbnailUrl = `${originalUrl}&variant=thumbnail`;
  const requestUrl = variant === 'thumbnail' ? thumbnailUrl : originalUrl;
  const cache = 'caches' in globalThis ? await caches.open(PHOTO_PREFIX + scope) : null;
  const cached = await cache?.match(requestUrl);
  if (cached) {
    const savedAt = Number(cached.headers.get('x-citas-cached-at'));
    if (savedAt && Date.now() - savedAt < PHOTO_AGE) return cached.blob();
    await cache?.delete(requestUrl);
  }
  let response: Response;
  try {
    response = await fetch(requestUrl, { credentials: 'same-origin', cache: 'no-store' });
  } catch (error) {
    const alternate = await cache?.match(variant === 'original' ? thumbnailUrl : originalUrl);
    if (alternate) {
      const savedAt = Number(alternate.headers.get('x-citas-cached-at'));
      if (savedAt && Date.now() - savedAt < PHOTO_AGE) return alternate.blob();
    }
    throw error;
  }
  if (!response.ok) throw new Error('Foto no disponible');
  const blob = await response.blob();
  if (!blob.type.startsWith('image/')) throw new Error('Foto no válida');
  if (cache && generation === expectedGeneration) {
    const headers = new Headers({
      'Content-Type': blob.type,
      'x-citas-cached-at': String(Date.now()),
    });
    await cache.delete(requestUrl);
    await cache.put(requestUrl, new Response(blob, { headers }));
    const keys = await cache.keys();
    await Promise.all(
      keys.slice(0, Math.max(0, keys.length - MAX_PHOTOS)).map((k) => cache.delete(k)),
    );
    if (generation !== expectedGeneration) await cache.delete(requestUrl);
  }
  return blob;
}

type PhotoVariant = 'original' | 'thumbnail';
const photoUrlKey = (url: string, scope: string, variant: PhotoVariant) =>
  `${scope}
${variant}
${url}`;
export function peekPhotoUrl(url: string, scope: string, variant: PhotoVariant) {
  return photoUrls.get(photoUrlKey(url, scope, variant));
}
export function loadPhotoUrl(
  url: string,
  scope: string,
  expectedGeneration: number,
  variant: PhotoVariant = 'original',
): Promise<string> {
  const key = photoUrlKey(url, scope, variant);
  const existing = photoUrls.get(key);
  if (existing) return Promise.resolve(existing);
  const pending = pendingPhotoUrls.get(key);
  if (pending) return pending;
  const promise = loadPhoto(url, scope, expectedGeneration, variant)
    .then((blob) => {
      if (generation !== expectedGeneration) throw new Error('La sesión ha cambiado');
      const objectUrl = URL.createObjectURL(blob);
      photoUrls.set(key, objectUrl);
      if (photoUrls.size > MAX_PHOTO_URLS) {
        const [oldestKey, oldestUrl] = photoUrls.entries().next().value!;
        photoUrls.delete(oldestKey);
        URL.revokeObjectURL(oldestUrl);
      }
      return objectUrl;
    })
    .finally(() => {
      if (pendingPhotoUrls.get(key) === promise) pendingPhotoUrls.delete(key);
    });
  pendingPhotoUrls.set(key, promise);
  return promise;
}
