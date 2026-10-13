import { requireAuth } from '@/lib/auth-middleware';
import { handleApiError } from '@/lib/db-errors';
import { geocode } from '@/lib/geoapify';
export async function GET(request: Request) {
  try {
    await requireAuth(request);
    const query = new URL(request.url).searchParams;
    const lat = Number(query.get('lat')), lng = Number(query.get('lng'));
    if (!query.has('lat') || !query.has('lng') || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return Response.json({ error: 'Coordenadas inválidas' }, { status: 400 });
    const places = await geocode('reverse', new URLSearchParams({ lat: String(lat), lon: String(lng) }));
    return Response.json({ place: places[0] || null });
  } catch (error) { return handleApiError(error); }
}
