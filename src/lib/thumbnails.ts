import 'server-only';
import sharp from 'sharp';
import { publicUrlFor, putObject, thumbnailKey } from '@/lib/r2';

const MAX_ORIGINAL_BYTES = 20 * 1024 * 1024;

export async function fetchStoredImage(key: string) {
  const response = await fetch(publicUrlFor(key), {
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
  });
  const type = response.headers.get('content-type') || '';
  return response.ok && type.startsWith('image/') ? { response, type } : null;
}

export async function renderThumbnail(original: Uint8Array) {
  if (original.length > MAX_ORIGINAL_BYTES) return null;
  try {
    return new Uint8Array(
      await sharp(original, { limitInputPixels: 40_000_000 })
        .rotate()
        .resize(512, 512, { fit: 'cover', withoutEnlargement: true })
        .webp({ quality: 84 })
        .toBuffer(),
    );
  } catch {
    return null;
  }
}

export async function storeThumbnail(key: string, thumbnail: Uint8Array) {
  try {
    await putObject(thumbnailKey(key), thumbnail, 'image/webp');
  } catch (error) {
    console.error('[thumbnails] could not store thumbnail', error);
  }
}

export async function generateThumbnail(key: string) {
  const stored = await fetchStoredImage(key);
  if (!stored) return;
  const thumbnail = await renderThumbnail(new Uint8Array(await stored.response.arrayBuffer()));
  if (thumbnail) await storeThumbnail(key, thumbnail);
}
