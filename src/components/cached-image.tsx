'use client';
import { useEffect, useRef, useState } from 'react';
import { currentGeneration, loadPhoto } from '@/lib/offline';
export function CachedImage({ src, alt, scope, className = '', ...props }: { src: string; alt: string; scope?: string; className?: string; loading?: 'lazy' | 'eager' }) {
  const [result, setResult] = useState<{ source: string; blob: string | null; failed: boolean } | null>(null);
  const container = useRef<HTMLSpanElement>(null);
  const local = src.startsWith('/') || !scope || /^https:\/\/[^/]*clerk\.(com|dev)\//.test(src);
  useEffect(() => {
    if (local) return;
    let cancelled = false;
    let objectUrl: string | undefined;
    const gen = currentGeneration();
    const load = () => {
      void loadPhoto(src, scope!, gen).then(blob => {
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled && gen === currentGeneration()) setResult({ source: src, blob: objectUrl, failed: false });
        else URL.revokeObjectURL(objectUrl);
      }).catch(() => { if (!cancelled) setResult({ source: src, blob: null, failed: true }); });
    };
    let observer: IntersectionObserver | undefined;
    if (props.loading === 'lazy' && container.current) {
      observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { observer?.disconnect(); load(); } });
      observer.observe(container.current);
    } else load();
    return () => { cancelled = true; observer?.disconnect(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [src, scope, local, props.loading]);
  if (local) return <img src={src} alt={alt} className={className} {...props} />;
  if (!result || result.source !== src || !result.blob) return <span ref={container} role="img" aria-label={alt} className={`image-placeholder ${className}`}>{result?.failed ? 'Foto no disponible' : 'Cargando foto…'}</span>;
  return <img src={result.blob} alt={alt} className={className} {...props} />;
}
