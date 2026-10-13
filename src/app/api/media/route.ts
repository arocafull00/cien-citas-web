import { requireAuth, requireCouple } from '@/lib/auth-middleware';
import { handleApiError } from '@/lib/db-errors';
import { storageKey } from '@/lib/storage-key';
export async function GET(request: Request) {
  try {
    const { userId } = await requireAuth(request);
    const raw = new URL(request.url).searchParams.get('url');
    const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, '');
    const key = raw && base ? storageKey(raw, base) : null;
    if (!key || !raw) return Response.json({ error: 'Imagen inválida' }, { status: 400 });
    if (!key.startsWith(`avatars/${userId}/`)) {
      const { coupleId, partnerId } = await requireCouple(userId);
      if (!key.startsWith(`${coupleId}/`) && !(partnerId && key.startsWith(`avatars/${partnerId}/`))) return Response.json({ error: 'Sin permisos' }, { status: 403 });
    }
    const response = await fetch(raw, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000) });
    const type = response.headers.get('content-type') || '';
    if (!response.ok || !type.startsWith('image/')) return Response.json({ error: 'Imagen no disponible' }, { status: 404 });
    return new Response(response.body, { headers: { 'Content-Type': type, 'Cache-Control': 'private, no-store' } });
  } catch (error) { return handleApiError(error); }
}
