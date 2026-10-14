export const runtime = 'nodejs';
import { after } from 'next/server';
import { requireAuth, requireCouple } from '@/lib/auth-middleware';
import { handleApiError } from '@/lib/db-errors';
import { keyFromUrl, thumbnailKey } from '@/lib/r2';
import { fetchStoredImage, renderThumbnail, storeThumbnail } from '@/lib/thumbnails';

const PRIVATE = 'private, no-store';

export async function GET(request: Request) {
  try {
    const { userId } = await requireAuth(request);
    const params = new URL(request.url).searchParams;
    const raw = params.get('url');
    const key = raw ? keyFromUrl(raw) : null;
    if (!key) return Response.json({ error: 'Imagen inválida' }, { status: 400 });
    if (!key.startsWith(`avatars/${userId}/`)) {
      const { coupleId, partnerId } = await requireCouple(userId);
      if (
        !key.startsWith(`${coupleId}/`) &&
        !(partnerId && key.startsWith(`avatars/${partnerId}/`))
      )
        return Response.json({ error: 'Sin permisos' }, { status: 403 });
    }

    if (params.get('variant') === 'thumbnail') {
      const cached = await fetchStoredImage(thumbnailKey(key));
      if (cached) {
        return new Response(cached.response.body, {
          headers: { 'Content-Type': cached.type, 'Cache-Control': PRIVATE },
        });
      }
    }

    const stored = await fetchStoredImage(key);
    if (!stored) return Response.json({ error: 'Imagen no disponible' }, { status: 404 });

    if (params.get('variant') === 'thumbnail') {
      const original = new Uint8Array(await stored.response.arrayBuffer());
      if (original.length > 20 * 1024 * 1024)
        return Response.json({ error: 'Imagen demasiado grande' }, { status: 413 });
      const thumbnail = await renderThumbnail(original);
      if (!thumbnail) {
        return new Response(original, {
          headers: { 'Content-Type': stored.type, 'Cache-Control': PRIVATE },
        });
      }
      after(() => storeThumbnail(key, thumbnail));
      return new Response(thumbnail, {
        headers: { 'Content-Type': 'image/webp', 'Cache-Control': PRIVATE },
      });
    }

    return new Response(stored.response.body, {
      headers: { 'Content-Type': stored.type, 'Cache-Control': PRIVATE },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
