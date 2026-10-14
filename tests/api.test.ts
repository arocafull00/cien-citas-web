import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ requireAuth: vi.fn(), requireCouple: vi.fn(), fetch: vi.fn() }));
vi.mock('@/lib/auth-middleware', () => ({
  requireAuth: mocks.requireAuth,
  requireCouple: mocks.requireCouple,
}));
import { GET as media } from '@/app/api/media/route';
import { GET as places } from '@/app/api/places/route';
import { GET as reverse } from '@/app/api/places/reverse/route';
import { storageKey } from '@/lib/storage-key';
beforeEach(() => {
  mocks.requireAuth.mockResolvedValue({ userId: 'user-a' });
  mocks.requireCouple.mockResolvedValue({ coupleId: 'couple-a', partnerId: 'user-b' });
  process.env.R2_PUBLIC_URL = 'https://bucket.example';
  process.env.GEOAPIFY_API_KEY = 'test-key';
  vi.stubGlobal('fetch', mocks.fetch);
});
describe('permisos de imágenes y búsqueda de lugares', () => {
  it('rechaza fotos de otra pareja antes de acceder al almacenamiento', async () => {
    const response = await media(
      new Request(
        'https://app.example/api/media?url=' +
          encodeURIComponent('https://bucket.example/couple-other/catalog/1/a.png'),
      ),
    );
    expect(response.status).toBe(403);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('normaliza rutas y rechaza URLs externas, firmadas o con traversal', () => {
    expect(
      storageKey(
        'https://bucket.example/couple-a/../couple-other/photo.png',
        'https://bucket.example',
      ),
    ).toBe('couple-other/photo.png');
    expect(
      storageKey('https://bucket.example/couple-a/%2F..%2Fphoto.png', 'https://bucket.example'),
    ).toBeNull();
    expect(
      storageKey('https://bucket.example.evil.test/couple-a/image.png', 'https://bucket.example'),
    ).toBeNull();
    expect(
      storageKey(
        'https://bucket.example/couple-a/image.png?token=secret',
        'https://bucket.example',
      ),
    ).toBeNull();
  });
  it('sirve una foto de la pareja con cabeceras privadas', async () => {
    mocks.fetch.mockResolvedValue(new Response(new Blob(['photo'], { type: 'image/png' })));
    const response = await media(
      new Request(
        'https://app.example/api/media?url=' +
          encodeURIComponent('https://bucket.example/couple-a/catalog/1/a.png'),
      ),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });
  it('no llama al proveedor por una búsqueda demasiado corta', async () => {
    const response = await places(new Request('https://app.example/api/places?q=ab'));
    expect(await response.json()).toEqual({ places: [] });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('devuelve coordenadas normalizadas y aplica cercanía, español y España', async () => {
    mocks.fetch.mockResolvedValue(
      Response.json({
        results: [
          { place_id: 'place', formatted: 'Jardín del Turia, Valencia', lat: 39.47, lon: -0.37 },
        ],
      }),
    );
    const response = await places(
      new Request('https://app.example/api/places?q=Turia&lat=39.4&lng=-0.3'),
    );
    expect(await response.json()).toEqual({
      places: [{ id: 'place', name: 'Jardín del Turia, Valencia', lat: 39.47, lng: -0.37 }],
    });
    const url = new URL(mocks.fetch.mock.calls[0][0]);
    expect(url.searchParams.get('filter')).toBe('countrycode:es');
    expect(url.searchParams.get('bias')).toBe('proximity:-0.3,39.4');
    expect(url.searchParams.get('lang')).toBe('es');
  });
  it('rechaza coordenadas inválidas y no revela errores del proveedor', async () => {
    expect(
      (await reverse(new Request('https://app.example/api/places/reverse?lat=100&lng=0'))).status,
    ).toBe(400);
    mocks.fetch.mockResolvedValue(new Response('provider-secret-debug-data', { status: 500 }));
    const response = await places(new Request('https://app.example/api/places?q=Valencia'));
    expect(response.status).toBe(502);
    expect(JSON.stringify(await response.json())).not.toContain('provider-secret');
  });
});
