'use client';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { DateGrid } from './date-grid';
import { BottomNav } from './mobile-shell';
import { useApp } from './app-provider';
export function FeedScreen() {
  const router = useRouter();
  const navigate = useCallback((href: string) => router.push(href), [router]);
  const { account, couple, dates, scope, refresh, online } = useApp();
  const greeting = [account?.name, couple?.partner?.name].filter(Boolean).join(' y ');
  function prefetch(event: React.PointerEvent) {
    if (!online || !(event.target instanceof Element)) return;
    const href = event.target.closest('a')?.getAttribute('href');
    if (href?.startsWith('/') && !href.startsWith('/offline')) router.prefetch(href);
  }
  return (
    <div className="with-nav" onPointerDown={prefetch}>
      <DateGrid
        key={scope}
        navigate={online ? navigate : undefined}
        dates={dates}
        greeting={greeting}
        scope={scope}
        refresh={online ? refresh : undefined}
        readonly={!online}
      />
      <BottomNav />
    </div>
  );
}
