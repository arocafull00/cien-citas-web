import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCouple: vi.fn(),
  findPhotoTarget: vi.fn(),
  fetch: vi.fn(),
}));
vi.mock('@/lib/auth-middleware', () => ({
  requireAuth: mocks.requireAuth,
  requireCouple: mocks.requireCouple,
}));
vi.mock('@/lib/date-photos', () => ({
  findPhotoTarget: mocks.findPhotoTarget,
  photoLimitResponse: () => Response.json({ error: 'Máximo 10 fotos por cita' }, { status: 409 }),
}));
vi.mock('@/db', () => ({ db: {} }));
import { POST as presign } from '@/app/api/upload/presign/route';
import { POST as avatarPresign } from '@/app/api/profile/avatar-presign/route';
import { GET as media } from '@/app/api/media/route';

const target = {
  kind: 'catalog',
  id: '11111111-1111-4111-8111-111111111111',
  prefix: 'couple-a/catalog/11111111-1111-4111-8111-111111111111',
  photos: 2,
};

function post(body: unknown) {
  return new Request('https://app.example/api/upload/presign', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  mocks.requireAuth.mockResolvedValue({ userId: 'user-a' });
  mocks.requireCouple.mockResolvedValue({ coupleId: 'couple-a', partnerId: 'user-b' });
  mocks.findPhotoTarget.mockResolvedValue(target);
  process.env.R2_PUBLIC_URL = 'https://bucket.example';
  process.env.R2_ACCOUNT_ID = 'account';
  process.env.R2_ACCESS_KEY_ID = 'test-access-key';
  process.env.R2_SECRET_ACCESS_KEY = 'test-secret-key';
  process.env.R2_BUCKET_NAME = 'bucket';
  vi.stubGlobal('fetch', mocks.fetch);
});

describe('subida de fotos', () => {
  it('firma el tipo y el tamaño para que R2 rechace otro archivo', async () => {
    const response = await presign(
      post({
        filename: 'playa.jpg',
        contentType: 'image/jpeg',
        size: 1234,
        coupleDateId: target.id,
      }),
    );
    expect(response.status).toBe(200);
    const { presignedUrl, publicUrl } = await response.json();
    const signed = new URL(presignedUrl).searchParams.get('X-Amz-SignedHeaders');
    expect(signed?.split(';')).toEqual(expect.arrayContaining(['content-length', 'content-type']));
    expect(publicUrl).toMatch(
      /^https:\/\/bucket\.example\/couple-a\/catalog\/[^/]+\/\d+-playa\.jpg$/,
    );
  });

  it('rechaza HTML u otros tipos que no son fotos', async () => {
    const response = await presign(
      post({ filename: 'x.html', contentType: 'text/html', size: 10, coupleDateId: target.id }),
    );
    expect(response.status).toBe(400);
    const avatar = await avatarPresign(
      post({ filename: 'x.svg', contentType: 'image/svg+xml', size: 10 }),
    );
    expect(avatar.status).toBe(400);
  });

  it('rechaza archivos de más de 15 MB o sin tamaño', async () => {
    for (const size of [16 * 1024 * 1024, 0, undefined, '100']) {
      const response = await presign(
        post({ filename: 'a.jpg', contentType: 'image/jpeg', size, coupleDateId: target.id }),
      );
      expect(response.status).toBe(400);
    }
  });

  it('no permite más de diez fotos por cita', async () => {
    mocks.findPhotoTarget.mockResolvedValue({ ...target, photos: 10 });
    const response = await presign(
      post({ filename: 'a.jpg', contentType: 'image/jpeg', size: 10, coupleDateId: target.id }),
    );
    expect(response.status).toBe(409);
  });

  it('responde 400 a un cuerpo que no es JSON', async () => {
    expect((await presign(post('{no json'))).status).toBe(400);
  });

  it('sirve la miniatura guardada sin volver a procesar el original', async () => {
    mocks.fetch.mockResolvedValue(new Response(new Blob(['thumb'], { type: 'image/webp' })));
    const response = await media(
      new Request(
        'https://app.example/api/media?variant=thumbnail&url=' +
          encodeURIComponent('https://bucket.example/couple-a/catalog/1/a.jpg'),
      ),
    );
    expect(response.status).toBe(200);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.fetch.mock.calls[0][0]).toBe(
      'https://bucket.example/couple-a/catalog/1/a.jpg.thumb.webp',
    );
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });
});
