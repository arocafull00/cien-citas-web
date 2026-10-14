'use client';
import { Button } from '@/components/ui/button';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { CachedImage } from './cached-image';
export function PhotoViewer({
  images,
  index,
  scope,
  title,
  close,
}: {
  images: { id: string; url: string }[];
  index: number;
  scope: string;
  title?: string;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ x: number; y: number; axis: 'x' | 'y' | null; dy: number } | null>(null);
  const [active, setActive] = useState(index);
  const [chrome, setChrome] = useState(true);
  const [drag, setDrag] = useState(0);
  const [settling, setSettling] = useState(false);
  useLayoutEffect(() => {
    const el = track.current;
    if (el) el.scrollLeft = index * el.clientWidth;
  }, [index]);
  useEffect(() => {
    const el = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    el?.showModal();
    return () => {
      el?.close();
      previous?.focus();
    };
  }, []);
  useEffect(() => {
    strip.current?.children[active]?.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: 'smooth',
    });
  }, [active]);
  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    const next = Math.max(0, Math.min(images.length - 1, i));
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
  };
  const fade = Math.min(drag / 300, 0.85);
  return (
    <dialog
      ref={dialog}
      className="photo-dialog"
      data-chrome={chrome ? 'visible' : 'hidden'}
      style={{ backgroundColor: `rgb(0 0 0 / ${1 - fade})` }}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') go(active + 1);
        if (e.key === 'ArrowLeft') go(active - 1);
      }}
      aria-label="Visor de fotografías"
    >
      <div className="viewer-top">
        <Button variant="plain" aria-label="Cerrar visor" onClick={close}>
          <X />
        </Button>
        <div className="viewer-title">
          <strong>
            {active + 1} de {images.length}
          </strong>
          {title ? <span>{title}</span> : null}
        </div>
        <span className="viewer-spacer" />
      </div>
      <div
        ref={track}
        className="viewer-track"
        style={{
          transform: drag ? `translateY(${drag}px) scale(${1 - fade * 0.25})` : undefined,
          transition: settling ? 'transform 0.25s ease' : undefined,
        }}
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollLeft / el.clientWidth);
          if (i !== active && i >= 0 && i < images.length) setActive(i);
        }}
        onTouchStart={(e) => {
          setSettling(false);
          gesture.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, axis: null, dy: 0 };
        }}
        onTouchMove={(e) => {
          const g = gesture.current;
          if (!g) return;
          const dx = e.touches[0].clientX - g.x;
          const dy = e.touches[0].clientY - g.y;
          if (!g.axis && Math.hypot(dx, dy) > 8) g.axis = Math.abs(dy) > Math.abs(dx) ? 'y' : 'x';
          if (g.axis === 'y') {
            g.dy = Math.max(0, dy);
            setDrag(g.dy);
          }
        }}
        onTouchEnd={() => {
          const g = gesture.current;
          gesture.current = null;
          if (g?.axis !== 'y') return;
          if (g.dy > 120) close();
          else {
            setSettling(true);
            setDrag(0);
          }
        }}
      >
        {images.map((image, i) => (
          <div key={image.id} className="viewer-slide" onClick={() => setChrome((value) => !value)}>
            {Math.abs(i - active) <= 2 ? (
              <CachedImage
                src={image.url}
                alt={`Recuerdo ${i + 1} de ${images.length}`}
                scope={scope}
                variant={Math.abs(i - active) <= 1 ? 'original' : 'thumbnail'}
              />
            ) : null}
          </div>
        ))}
      </div>
      {images.length > 1 ? (
        <>
          <Button
            variant="plain"
            className="viewer-arrow viewer-prev"
            aria-label="Foto anterior"
            disabled={active === 0}
            onClick={() => go(active - 1)}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="plain"
            className="viewer-arrow viewer-next"
            aria-label="Foto siguiente"
            disabled={active === images.length - 1}
            onClick={() => go(active + 1)}
          >
            <ChevronRight />
          </Button>
          <div ref={strip} className="viewer-strip">
            {images.map((image, i) => (
              <Button
                variant="plain"
                key={image.id}
                aria-label={`Ver foto ${i + 1}`}
                aria-current={i === active}
                onClick={() => go(i)}
              >
                <CachedImage
                  src={image.url}
                  alt=""
                  scope={scope}
                  variant="thumbnail"
                  loading="lazy"
                />
              </Button>
            ))}
          </div>
        </>
      ) : null}
    </dialog>
  );
}
