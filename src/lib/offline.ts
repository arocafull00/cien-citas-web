import { openDB } from 'idb';
import type { Snapshot } from './types';

export const OFFLINE_DB = '100citas-offline-v1';
const PHOTO_PREFIX = '100citas-photos-v1-';
const MAX_PHOTOS = 100;
const PHOTO_AGE = 30 * 24 * 60 * 60 * 1000;
let generation = 0;
export const currentGeneration = () => generation;
export const beginContext = () => ++generation;
export const snapshotKey = (snapshot: Pick<Snapshot, 'account' | 'couple'>) => `${snapshot.account.clerkUserId}:${snapshot.couple.id}`;
const database = () => openDB(OFFLINE_DB, 1, { upgrade(db) { db.createObjectStore('snapshots'); db.createObjectStore('meta'); } });

export async function saveSnapshot(snapshot: Snapshot, expectedGeneration: number) {
  const db = await database();
  if (generation !== expectedGeneration) return;
  const tx = db.transaction(['snapshots', 'meta'], 'readwrite');
  const key = snapshotKey(snapshot);
  await Promise.all([tx.objectStore('snapshots').put(snapshot, key), tx.objectStore('meta').put(key, 'active')]);
  await tx.done;
}
export async function readSnapshot(userId?: string, coupleId?: string): Promise<Snapshot | null> {
  const db = await database();
  const active = await db.get('meta', 'active') as string | undefined;
  if (!active) return null;
  const value = await db.get('snapshots', active) as Snapshot | undefined;
  if (!value || (userId && value.account.clerkUserId !== userId) || (coupleId && value.couple.id !== coupleId)) return null;
  return value;
}
export async function clearPrivateData() {
  ++generation;
  const db = await database();
  const tx = db.transaction(['snapshots', 'meta'], 'readwrite');
  await Promise.all([tx.objectStore('snapshots').clear(), tx.objectStore('meta').clear()]);
  await tx.done;
  if ('caches' in globalThis) await Promise.all((await caches.keys()).filter(k => k.startsWith(PHOTO_PREFIX)).map(k => caches.delete(k)));
  if (typeof window !== 'undefined') {
    Object.keys(localStorage).filter(k => k.startsWith('100citas:profile:')).forEach(k => localStorage.removeItem(k));
  }
}

export async function loadPhoto(url: string, scope: string, expectedGeneration: number): Promise<Blob> {
  const requestUrl = `/api/media?url=${encodeURIComponent(url)}`;
  const cache = 'caches' in globalThis ? await caches.open(PHOTO_PREFIX + scope) : null;
  const cached = await cache?.match(requestUrl);
  if (cached) {
    const savedAt = Number(cached.headers.get('x-citas-cached-at'));
    if (savedAt && Date.now() - savedAt < PHOTO_AGE) return cached.blob();
    await cache?.delete(requestUrl);
  }
  const response = await fetch(requestUrl, { credentials: 'same-origin', cache: 'no-store' });
  if (!response.ok) throw new Error('Foto no disponible');
  const blob = await response.blob();
  if (!blob.type.startsWith('image/')) throw new Error('Foto no válida');
  if (cache && generation === expectedGeneration) {
    const headers = new Headers({ 'Content-Type': blob.type, 'x-citas-cached-at': String(Date.now()) });
    await cache.delete(requestUrl);
    await cache.put(requestUrl, new Response(blob, { headers }));
    const keys = await cache.keys();
    await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_PHOTOS)).map(k => cache.delete(k)));
    if (generation !== expectedGeneration) await cache.delete(requestUrl);
  }
  return blob;
}
