'use client';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { CachedImage } from './cached-image';
export function PhotoViewer({ images, index, scope, close }: { images: { id: string; url: string }[]; index: number; scope: string; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const touch = useRef<number | null>(null);
  const [active, setActive] = useState(index);
  useEffect(() => { const el = dialog.current; const previous = document.activeElement as HTMLElement | null; el?.showModal(); return () => { el?.close(); previous?.focus(); }; }, []);
  const move = (direction: number) => setActive(i => (i + direction + images.length) % images.length);
  return <dialog ref={dialog} className="photo-dialog" onCancel={e => { e.preventDefault(); close(); }} onKeyDown={e => { if (e.key === 'ArrowRight') move(1); if (e.key === 'ArrowLeft') move(-1); }} aria-label="Visor de fotografías">
    <div className="viewer-top"><span>{active + 1} / {images.length}</span><Button variant="ghost" size="unstyled" aria-label="Cerrar visor" onClick={close}><X /></Button></div>
    <div className="viewer-image" onTouchStart={e => { touch.current = e.touches[0].clientX; }} onTouchEnd={e => { if (touch.current !== null) { const delta = e.changedTouches[0].clientX - touch.current; if (Math.abs(delta) > 45) move(delta < 0 ? 1 : -1); touch.current = null; } }}><CachedImage src={images[active].url} alt={`Recuerdo ${active + 1}`} scope={scope} /></div>
    {images.length > 1 ? <div className="viewer-controls"><Button variant="ghost" size="unstyled" aria-label="Foto anterior" onClick={() => move(-1)}><ChevronLeft /></Button><span>Desliza para ver más recuerdos</span><Button variant="ghost" size="unstyled" aria-label="Foto siguiente" onClick={() => move(1)}><ChevronRight /></Button></div> : null}
  </dialog>;
}
