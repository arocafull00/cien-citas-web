import { requireAuth } from '@/lib/auth-middleware';
import { handleApiError } from '@/lib/db-errors';
import { geocode } from '@/lib/geoapify';
export async function GET(request: Request) {
  try {
    await requireAuth(request);
    const query = new URL(request.url).searchParams;
    const text = query.get('q')?.trim() || '';
    if (text.length < 3) return Response.json({ places: [] });
    if (text.length > 200) return Response.json({ error: 'Búsqueda demasiado larga' }, { status: 400 });
    const params = new URLSearchParams({ text, limit: '8', filter: 'countrycode:es' });
    const lat = Number(query.get('lat')), lng = Number(query.get('lng'));
    if (query.has('lat') && query.has('lng') && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) params.set('bias', `proximity:${lng},${lat}`);
    return Response.json({ places: await geocode('autocomplete', params) });
  } catch (error) { return handleApiError(error); }
}
