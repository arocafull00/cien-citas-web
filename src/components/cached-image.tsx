'use client';
import { useEffect, useRef, useState } from 'react';
import { currentGeneration, loadPhotoUrl, peekPhotoUrl } from '@/lib/offline';
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
  const [result, setResult] = useState<{ source: string; url: string | null } | null>(null);
  const container = useRef<HTMLElement | null>(null);
  const setContainer = (element: HTMLElement | null) => {
    container.current = element;
  };
  const source = `${scope || ''}:${variant}:${src}`;
  const local = src.startsWith('/') || !scope || /^https:\/\/[^/]*clerk\.(com|dev)\//.test(src);
  const url =
    (local ? src : peekPhotoUrl(src, scope!, variant)) ??
    (result?.source === source ? result.url : undefined);
  const pending = url === undefined;
  useEffect(() => {
    if (!pending) return;
    let cancelled = false;
    const gen = currentGeneration();
    const load = () => {
      void loadPhotoUrl(src, scope!, gen, variant)
        .then((objectUrl) => {
          if (!cancelled) setResult({ source, url: objectUrl });
        })
        .catch(() => {
          if (!cancelled && gen === currentGeneration()) setResult({ source, url: null });
        });
    };
    let observer: IntersectionObserver | undefined;
    if (props.loading === 'lazy' && container.current) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            observer?.disconnect();
            load();
          }
        },
        { rootMargin: '400px 0px' },
      );
      observer.observe(container.current);
    } else load();
    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [pending, src, source, scope, props.loading, variant]);
  if (url) return <img decoding="async" src={url} alt={alt} className={className} {...props} />;
  const preview =
    !local && variant === 'original' ? peekPhotoUrl(src, scope!, 'thumbnail') : undefined;
  const placeholder = preview || fallback;
  if (placeholder)
    return (
      <img
        ref={setContainer}
        decoding="async"
        src={placeholder}
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
      className={`image-placeholder ${className}`}
    >
      {url === null ? 'Foto no disponible' : null}
    </span>
  );
}
