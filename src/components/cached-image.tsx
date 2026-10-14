'use client';
import { useEffect, useRef, useState } from 'react';
import { currentGeneration, loadPhoto } from '@/lib/offline';
export function CachedImage({
  src,
  alt,
  scope,
  className = '',
  variant = 'original',
  fallback,
  ...props
}: {
  src: string;
  alt: string;
  scope?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  variant?: 'original' | 'thumbnail';
  fallback?: string;
}) {
  const [result, setResult] = useState<{
    source: string;
    blob: string | null;
    failed: boolean;
  } | null>(null);
  const container = useRef<HTMLElement | null>(null);
  const setContainer = (element: HTMLElement | null) => {
    container.current = element;
  };
  const source = `${scope || ''}:${variant}:${src}`;
  const local = src.startsWith('/') || !scope || /^https:\/\/[^/]*clerk\.(com|dev)\//.test(src);
  useEffect(() => {
    if (local) return;
    let cancelled = false;
    let objectUrl: string | undefined;
    const gen = currentGeneration();
    const load = () => {
      void loadPhoto(src, scope!, gen, variant)
        .then((blob) => {
          objectUrl = URL.createObjectURL(blob);
          if (!cancelled && gen === currentGeneration())
            setResult({ source, blob: objectUrl, failed: false });
          else URL.revokeObjectURL(objectUrl);
        })
        .catch(() => {
          if (!cancelled) setResult({ source, blob: null, failed: true });
        });
    };
    let observer: IntersectionObserver | undefined;
    if (props.loading === 'lazy' && container.current) {
      observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer?.disconnect();
          load();
        }
      });
      observer.observe(container.current);
    } else load();
    return () => {
      cancelled = true;
      observer?.disconnect();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, source, scope, local, props.loading, variant]);
  if (local) return <img decoding="async" src={src} alt={alt} className={className} {...props} />;
  if (!result || result.source !== source || !result.blob) {
    const failed = Boolean(result?.failed && result.source === source);
    if (fallback)
      return (
        <img
          ref={setContainer}
          decoding="async"
          src={fallback}
          alt={alt}
          className={className}
          {...props}
        />
      );
    return (
      <span
        ref={setContainer}
        role="img"
        aria-label={alt}
        className={`image-placeholder ${failed ? '' : 'loading'} ${className}`}
      >
        {failed ? 'Foto no disponible' : null}
      </span>
    );
  }
  return <img decoding="async" src={result.blob} alt={alt} className={className} {...props} />;
}
