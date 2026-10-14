'use client';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { CalendarDays, MapPin, Heart, Pencil } from 'lucide-react';
import { getCardBackground } from '@/constants/date-card';
import type { DateDetail } from '@/lib/types';
import { CachedImage } from './cached-image';
import { PhotoViewer } from './photo-viewer';
export function DateDetailView({
  date,
  scope,
  readonly = false,
  undo,
  remove,
  busy = false,
}: {
  date: DateDetail;
  scope: string;
  readonly?: boolean;
  undo?: () => void;
  remove?: () => void;
  busy?: boolean;
}) {
  const [photo, setPhoto] = useState<number | null>(null);
  const coords = date.locationLat !== null && date.locationLng !== null;
  const mapUrl = coords
    ? `https://www.google.com/maps/search/?api=1&query=${date.locationLat},${date.locationLng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(date.locationName || '')}`;
  return (
    <>
      {readonly ? (
        <header className="back-header">
          <a href="/offline" className="text-button">
            ← Citas
          </a>
          <h1>{date.isCustom ? 'Vuestra cita' : `Cita ${date.id}`}</h1>
        </header>
      ) : (
        <DetailHeader
          title={date.isCustom ? 'Vuestra cita' : `Cita ${date.id}`}
          action={
            <a href={`/edit-date?id=${date.id}`} className="icon-button" aria-label="Editar cita">
              <Pencil size={19} />
            </a>
          }
        />
      )}
      <main className="detail-page">
        <div className="detail-hero">
          <CachedImage
            src={date.images[0]?.url || getCardBackground(date.id).replace(/\.png$/, '.webp')}
            alt=""
            scope={scope}
            className="hero-background"
          />
          <div className="hero-shade" />
          <span className="hero-number">
            {date.isCustom ? 'Vuestra' : date.id.padStart(2, '0')}
          </span>
          <div>
            <span className="eyebrow">
              {date.completed ? 'UN RECUERDO JUNTOS' : 'UN MOMENTO POR VIVIR'}
            </span>
            <h2>{date.title}</h2>
          </div>
        </div>
        <div className="detail-content">
          <div className="detail-meta">
            <span className="category-pill">{date.category}</span>
            <span className="difficulty">{date.difficulty}</span>
            {date.isCustomized ? <span className="customized">Personalizada</span> : null}
          </div>
          <div className="ornament">♡</div>
          <p className="narrative">{date.description}</p>
          {date.completedAt ? (
            <p className="meta-line">
              <CalendarDays size={18} />
              {new Date(date.completedAt).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          ) : null}
          {date.locationName ? (
            <section className="detail-section">
              <h3>
                <MapPin size={18} /> Nuestro lugar
              </h3>
              <p>{date.locationName}</p>
              {!readonly && coords ? (
                <iframe
                  title="Mapa de vuestra cita"
                  loading="lazy"
                  className="static-map"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${[date.locationLng! - 0.015, date.locationLat! - 0.015, date.locationLng! + 0.015, date.locationLat! + 0.015].join(',')}&layer=mapnik&marker=${date.locationLat},${date.locationLng}`}
                />
              ) : null}
              {!readonly ? (
                <a className="text-button" href={mapUrl} target="_blank" rel="noreferrer">
                  Abrir en mapas ↗
                </a>
              ) : null}
            </section>
          ) : null}
          {date.notes ? (
            <section className="detail-section">
              <h3>Lo que queremos recordar</h3>
              <p className="notes">{date.notes}</p>
            </section>
          ) : null}
          {date.images.length ? (
            <section className="detail-section">
              <h3>
                Nuestros recuerdos <span>({date.images.length})</span>
              </h3>
              <div className="photo-gallery">
                {date.images.map((image, i) => (
                  <Button
                    variant="ghost"
                    size="unstyled"
                    key={image.id}
                    onClick={(e) => {
                      e.currentTarget.focus();
                      setPhoto(i);
                    }}
                    aria-label={`Abrir foto ${i + 1}`}
                  >
                    <CachedImage
                      src={image.url}
                      alt={`Recuerdo ${i + 1} de ${date.title}`}
                      scope={scope}
                      variant="thumbnail"
                      loading="lazy"
                    />
                  </Button>
                ))}
              </div>
            </section>
          ) : null}
          {!readonly && date.completed ? (
            <Button
              variant="ghost"
              size="unstyled"
              className="text-button danger"
              disabled={busy}
              onClick={undo}
            >
              Marcar como pendiente
            </Button>
          ) : null}
          {!readonly && date.isCustom ? (
            <Button
              variant="ghost"
              size="unstyled"
              className="text-button danger"
              disabled={busy}
              onClick={remove}
            >
              Eliminar esta cita
            </Button>
          ) : null}
        </div>
      </main>
      {!readonly ? (
        <div className="sticky-action">
          <a className="button" href={`/complete-date?id=${date.id}`}>
            <Heart size={18} />
            {date.completed ? 'Editar nuestro recuerdo' : '¡La hemos vivido!'}
          </a>
        </div>
      ) : null}
      {photo !== null ? (
        <PhotoViewer
          images={date.images}
          index={photo}
          scope={scope}
          close={() => setPhoto(null)}
        />
      ) : null}
    </>
  );
}

function DetailHeader({ title, action }: { title: string; action: React.ReactNode }) {
  return (
    <header className="back-header">
      <a className="text-button" href="/dates">
        ← Citas
      </a>
      <h1>{title}</h1>
      {action}
    </header>
  );
}
