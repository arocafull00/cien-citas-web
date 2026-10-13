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
  return <div className="with-nav"><DateGrid key={scope} navigate={online ? navigate : undefined} dates={dates} greeting={greeting} scope={scope} refresh={online ? refresh : undefined} readonly={!online} /><BottomNav /></div>;
}
