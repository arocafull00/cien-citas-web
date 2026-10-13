'use client';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { LocateFixed, MapPin } from 'lucide-react';
const LocationMap = dynamic(() => import('./location-map'), { ssr: false, loading: () => <div className="location-map image-placeholder">Abriendo mapa…</div> });
type Location = { name: string; lat: number | null; lng: number | null };
type Place = { id: string; name: string; lat: number; lng: number };
export function LocationPicker({ value, onChange, disabled }: { value: Location; onChange: (value: Location) => void; disabled?: boolean }) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [query, setQuery] = useState(value.name);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [locating, setLocating] = useState(false);
  const [near, setNear] = useState<{ lat: number; lng: number } | null>(null);
  const sequence = useRef(0);
  useEffect(() => {
    if (query.trim().length < 3 || !searching || disabled) return;
    const abort = new AbortController();
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ q: query });
      if (near) { params.set('lat', String(near.lat)); params.set('lng', String(near.lng)); }
      void fetch(`/api/places?${params}`, { signal: abort.signal, cache: 'no-store' }).then(async response => {
        const data = await response.json(); if (!response.ok) throw new Error(data.error); if (!abort.signal.aborted) setPlaces(data.places);
      }).catch(e => { if (!abort.signal.aborted) { setError(e.message || 'No pudimos buscar lugares.'); setPlaces([]); } });
    }, 350);
    return () => { clearTimeout(timer); abort.abort(); };
  }, [query, searching, disabled, near]);

  async function chooseCoordinates(lat: number, lng: number) {
    const current = ++sequence.current;
    const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    onChange({ name: fallback, lat, lng }); setQuery(fallback); setSearching(false); setPlaces([]); setError('');
    try {
      const response = await fetch(`/api/places/reverse?lat=${lat}&lng=${lng}`, { cache: 'no-store' });
      const data = await response.json();
      if (current !== sequence.current) return;
      if (!response.ok) throw new Error(data.error);
      if (data.place) { onChange({ name: data.place.name, lat, lng }); setQuery(data.place.name); }
    } catch { if (current === sequence.current) setError('Ubicación elegida. Puedes escribir el nombre del lugar.'); }
  }
  return <div className="location-picker"><label className="field">Dónde lo vivimos<div className="input-with-icon"><MapPin size={18} /><input value={query} disabled={disabled} placeholder="Busca un lugar o escribe su nombre" autoComplete="off" onChange={e => { ++sequence.current; setQuery(e.target.value); setSearching(true); onChange({ name: e.target.value, lat: null, lng: null }); setPlaces([]); setError(''); }} onBlur={() => { if (query !== value.name) onChange({ name: query, lat: value.lat, lng: value.lng }); }} /></div></label>
    {places.length ? <ul className="place-results" aria-label="Lugares encontrados">{places.map(place => <li key={place.id}><button type="button" onMouseDown={e => e.preventDefault()} onClick={() => { ++sequence.current; onChange({ name: place.name, lat: place.lat, lng: place.lng }); setQuery(place.name); setSearching(false); setPlaces([]); }}><MapPin size={16} />{place.name}</button></li>)}</ul> : null}
    <button type="button" className="text-button" disabled={disabled || locating} onClick={() => { setError(''); if (!navigator.geolocation) { setError('Tu navegador no permite acceder a la ubicación.'); return; } setLocating(true); navigator.geolocation.getCurrentPosition(position => { setLocating(false); const point = { lat: position.coords.latitude, lng: position.coords.longitude }; setNear(point); void chooseCoordinates(point.lat, point.lng); }, () => { setLocating(false); setError('No pudimos acceder a tu ubicación. Puedes buscar o elegir el lugar en el mapa.'); }, { timeout: 10000, maximumAge: 60000 }); }}><LocateFixed size={17} />{locating ? 'Buscando tu ubicación…' : 'Usar mi ubicación'}</button>
    {!disabled ? <LocationMap lat={value.lat} lng={value.lng} onSelect={(lat, lng) => void chooseCoordinates(lat, lng)} /> : null}
    {error ? <p role="status" className="field-hint">{error}</p> : null}<p className="attribution">Powered by <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">Geoapify</a> · © OpenStreetMap contributors</p>
  </div>;
}
