'use client';
import { useEffect, useRef } from 'react';
import type { Map as LeafletMap, Marker } from 'leaflet';
import 'leaflet/dist/leaflet.css';
export default function LocationMap({
  lat,
  lng,
  onSelect,
}: {
  lat: number | null;
  lng: number | null;
  onSelect: (lat: number, lng: number) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const callback = useRef(onSelect);
  const initial = useRef({ lat, lng });
  useEffect(() => {
    callback.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    initial.current = { lat, lng };
  }, [lat, lng]);
  useEffect(() => {
    let cancelled = false;
    void import('leaflet').then((L) => {
      if (cancelled || !container.current) return;
      const point = initial.current;
      const instance = L.map(container.current, { scrollWheelZoom: false }).setView(
        [point.lat ?? 39.4699, point.lng ?? -0.3763],
        point.lat === null ? 6 : 14,
      );
      map.current = instance;
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(instance);
      const icon = L.divIcon({
        className: 'map-pin',
        html: '<span></span>',
        iconSize: [24, 30],
        iconAnchor: [12, 30],
      });
      if (point.lat !== null && point.lng !== null)
        marker.current = L.marker([point.lat, point.lng], { icon }).addTo(instance);
      instance.on('click', (event) => {
        const { lat: latitude, lng: longitude } = event.latlng;
        callback.current(latitude, longitude);
      });
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
  }, []);
  useEffect(() => {
    if (lat === null || lng === null || !map.current) return;
    const instance = map.current;
    void import('leaflet').then((L) => {
      if (map.current !== instance) return;
      if (marker.current) marker.current.setLatLng([lat, lng]);
      else
        marker.current = L.marker([lat, lng], {
          icon: L.divIcon({
            className: 'map-pin',
            html: '<span></span>',
            iconSize: [24, 30],
            iconAnchor: [12, 30],
          }),
        }).addTo(instance);
      instance.setView([lat, lng], 14);
    });
  }, [lat, lng]);
  return (
    <div
      ref={container}
      className="location-map"
      role="region"
      aria-label="Mapa para elegir la ubicación. También puedes usar el buscador."
    />
  );
}
