import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { beginContext, clearPrivateData, currentGeneration, loadPhoto, readSnapshot, saveSnapshot } from '@/lib/offline';
import type { Snapshot } from '@/lib/types';
const snapshot = (user = 'user-a', couple = 'couple-a'): Snapshot => ({
  account: { id: 'db-user', clerkUserId: user, name: 'Ana', avatarUrl: null },
  couple: { id: couple, inviteCode: 'ABC123', createdAt: '2026-01-01', partner: { name: 'Luis', avatarUrl: null } },
  dates: [], details: {}, profile: null, achievements: [], updatedAt: '2026-10-04T12:00:00Z',
});
const photoCaches = new Map<string, Map<string, Response>>();
beforeEach(async () => {
  photoCaches.clear();
  vi.stubGlobal('caches', {
    keys: async () => [...photoCaches.keys()], delete: async (name: string) => photoCaches.delete(name),
    open: async (name: string) => {
      if (!photoCaches.has(name)) photoCaches.set(name, new Map());
      const cache = photoCaches.get(name)!;
      return { match: async (key: string) => cache.get(key)?.clone(), put: async (key: string, response: Response) => { cache.set(key, response.clone()); }, keys: async () => [...cache.keys()], delete: async (key: string) => cache.delete(key) };
    },
  });
  await clearPrivateData();
});
describe('recuerdos offline privados', () => {
  it('restaura una instantánea y la restringe al usuario y pareja correctos', async () => {
    await saveSnapshot(snapshot(), currentGeneration());
    expect((await readSnapshot('user-a', 'couple-a'))?.account.name).toBe('Ana');
    expect(await readSnapshot('user-b')).toBeNull();
    expect(await readSnapshot('user-a', 'couple-b')).toBeNull();
  });
  it('descarta una escritura que termina después de cerrar sesión', async () => {
    const previous = currentGeneration();
    await clearPrivateData();
    await saveSnapshot(snapshot(), previous);
    expect(await readSnapshot()).toBeNull();
  });
  it('elimina instantáneas y fotos al limpiar la sesión', async () => {
    await saveSnapshot(snapshot(), currentGeneration());
    photoCaches.set('100citas-photos-v1-user-a:couple-a', new Map());
    await clearPrivateData();
    expect(await readSnapshot()).toBeNull(); expect(photoCaches.size).toBe(0);
  });
  it('no guarda datos de un contexto anterior tras cambiar de pareja', async () => {
    const old = currentGeneration(); beginContext();
    await saveSnapshot(snapshot('user-a', 'couple-b'), currentGeneration());
    await saveSnapshot(snapshot(), old);
    expect((await readSnapshot())?.couple.id).toBe('couple-b');
  });
  it('sirve fotos vistas sin red y nunca reutiliza la caché de otra pareja', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(new Blob(['image-data'], { type: 'image/png' })));
    vi.stubGlobal('fetch', fetch);
    await loadPhoto('https://bucket.example/a.png', 'user-a:couple-a', currentGeneration());
    fetch.mockRejectedValue(new Error('offline'));
    expect((await loadPhoto('https://bucket.example/a.png', 'user-a:couple-a', currentGeneration())).size).toBe(10);
    await expect(loadPhoto('https://bucket.example/a.png', 'user-a:couple-b', currentGeneration())).rejects.toThrow('offline');
  });
  it('no guarda una foto cuyo contexto ha caducado durante la descarga', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { beginContext(); return new Response(new Blob(['image'], { type: 'image/png' })); }));
    await loadPhoto('https://bucket.example/a.png', 'user-a:couple-a', currentGeneration());
    expect([...photoCaches.values()].every(cache => cache.size === 0)).toBe(true);
  });
});
