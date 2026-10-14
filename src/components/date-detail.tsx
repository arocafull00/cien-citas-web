'use client';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { CalendarDays, MapPin, Heart, Pencil, Images } from 'lucide-react';
import { getCardBackground } from '@/constants/date-card';
import type { DateDetail } from '@/lib/types';
import { handleDateNavigation, type DateNavigation } from '@/lib/date-navigation';
import { CachedImage } from './cached-image';
import { PhotoViewer } from './photo-viewer';
export function DateDetailView({
  date,
  scope,
  readonly = false,
  undo,
  remove,
  busy = false,
  navigate,
}: {
  date: DateDetail;
  scope: string;
  readonly?: boolean;
  undo?: () => void;
  remove?: () => void;
  busy?: boolean;
  navigate?: DateNavigation;
}) {
  const [photo, setPhoto] = useState<number | null>(null);
  const editHref = `/edit-date?id=${date.id}`;
  const completeHref = `/complete-date?id=${date.id}`;
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
          navigate={navigate}
          action={
            <a
              href={editHref}
              className="icon-button"
              aria-label="Editar cita"
              onClick={(event) => handleDateNavigation(event, editHref, navigate)}
            >
              <Pencil size={19} />
            </a>
          }
        />
      )}
      <main className="detail-page">
        <div className="detail-hero">
          <CachedImage
            src={date.images[0]?.url || getCardBackground(date.id)}
            alt=""
            scope={scope}
            className="hero-background"
            fallback={getCardBackground(date.id)}
          />
          <div className="hero-shade" />
          {date.images.length ? (
            <>
              <button
                type="button"
                className="hero-open"
                aria-label={`Ver las ${date.images.length} fotos`}
                onClick={() => setPhoto(0)}
              />
              <span className="hero-count">
                <Images size={14} />
                {date.images.length}
              </span>
            </>
          ) : null}
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
                    variant="plain"
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
            <Button variant="text" className="danger" disabled={busy} onClick={undo}>
              Marcar como pendiente
            </Button>
          ) : null}
          {!readonly && date.isCustom ? (
            <Button variant="text" className="danger" disabled={busy} onClick={remove}>
              Eliminar esta cita
            </Button>
          ) : null}
        </div>
      </main>
      {!readonly ? (
        <div className="sticky-action">
          <a
            className="button"
            href={completeHref}
            onClick={(event) => handleDateNavigation(event, completeHref, navigate)}
          >
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
          title={date.title}
          close={() => setPhoto(null)}
        />
      ) : null}
    </>
  );
}

function DetailHeader({
  title,
  action,
  navigate,
}: {
  title: string;
  action: React.ReactNode;
  navigate?: DateNavigation;
}) {
  return (
    <header className="back-header">
      <a
        className="text-button"
        href="/dates"
        onClick={(event) => handleDateNavigation(event, '/dates', navigate)}
      >
        ← Citas
      </a>
      <h1>{title}</h1>
      {action}
    </header>
  );
}
