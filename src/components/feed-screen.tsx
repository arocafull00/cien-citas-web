'use client';
import { DateGrid } from './date-grid';
import { BottomNav } from './mobile-shell';
import { useApp } from './app-provider';
export function FeedScreen() {
  const { account, couple, dates, scope, refresh, online } = useApp();
  const greeting = [account?.name, couple?.partner?.name].filter(Boolean).join(' y ');
  return <div className="with-nav"><DateGrid dates={dates} greeting={greeting} scope={scope} refresh={online ? refresh : undefined} readonly={!online} /><BottomNav /></div>;
}
