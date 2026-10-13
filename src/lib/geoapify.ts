import 'server-only';
export type Place = { id: string; name: string; lat: number; lng: number };
export function normalizePlace(place: Record<string, unknown>): Place | null {
  if (typeof place.lat !== 'number' || typeof place.lon !== 'number') return null;
  return { id: String(place.place_id || `${place.lat},${place.lon}`), name: String(place.formatted || place.name || ''), lat: place.lat, lng: place.lon };
}
export async function geocode(kind: 'autocomplete' | 'reverse', params: URLSearchParams) {
  const key = process.env.GEOAPIFY_API_KEY;
  if (!key) throw Response.json({ error: 'La búsqueda de lugares no está configurada' }, { status: 503 });
  params.set('apiKey', key); params.set('format', 'json'); params.set('lang', 'es');
  const response = await fetch(`https://api.geoapify.com/v1/geocode/${kind}?${params}`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw Response.json({ error: 'No pudimos buscar esa ubicación. Puedes elegirla en el mapa.' }, { status: 502 });
  const body = await response.json() as { results: Record<string, unknown>[] };
  return body.results.map(normalizePlace).filter((p): p is Place => p !== null);
}
