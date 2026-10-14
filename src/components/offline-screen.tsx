'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { BookHeart, UserRound, WifiOff } from 'lucide-react';
import type { Snapshot } from '@/lib/types';
import { clearPrivateData, readSnapshot, snapshotKey } from '@/lib/offline';
import { DateGrid } from './date-grid';
import { DateDetailView } from './date-detail';
import { ProfileView } from './profile-view';
const subscribeLocation = (listener: () => void) => {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
};
export function OfflineScreen() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const href = useSyncExternalStore(
    subscribeLocation,
    () =>
      window.location.hash
        ? decodeURIComponent(window.location.hash.slice(1))
        : (window as Window & { __100citasOfflineUrl?: string }).__100citasOfflineUrl ||
          window.location.href,
    () => '/offline',
  );
  const url = new URL(href, 'https://offline.local');
  const path = url.searchParams.get('path') || url.pathname;
  const selection = url.searchParams.get('date') || /^\/date\/([^/]+)$/.exec(path)?.[1] || '';
  const profile = path === '/profile' || url.searchParams.get('view') === 'profile';
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    // The fallback HTML represents /offline, while the browser keeps the requested URL.
    void readSnapshot()
      .then((value) => {
        if (!cancelled) setSnapshot(value);
      })
      .catch(() => {
        if (!cancelled) setError('No pudimos acceder a los recuerdos guardados.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    const channel = new BroadcastChannel('100citas-session');
    channel.onmessage = () => {
      cancelled = true;
      void clearPrivateData();
      setSnapshot(null);
      setLoading(false);
    };
    return () => {
      cancelled = true;
      channel.close();
    };
  }, []);
  if (loading)
    return (
      <main className="page status-screen">
        <span className="spinner" />
        <p>Abriendo recuerdos guardados…</p>
      </main>
    );
  if (!snapshot)
    return (
      <main className="page status-screen">
        <WifiOff size={34} strokeWidth={1} />
        <h1>Tu diario te espera</h1>
        <p>
          {error ||
            'Todavía no hay recuerdos guardados en este dispositivo. Abre la app con conexión para guardarlos.'}
        </p>
        <a href="/dates" className="button">
          Volver a intentar
        </a>
      </main>
    );
  const scope = snapshotKey(snapshot);
  const detail = selection ? snapshot.details[selection] : null;
  return (
    <div className="with-nav">
      <div className="connection-notice" role="status">
        <span>
          Recuerdos guardados · Solo lectura
          <small>Actualizados el {new Date(snapshot.updatedAt).toLocaleString('es-ES')}</small>
        </span>
        <a href="/dates">Conectar</a>
      </div>
      {selection ? (
        detail ? (
          <DateDetailView date={detail} scope={scope} readonly />
        ) : (
          <main className="page status-screen">
            <h1>Este recuerdo aún no está guardado</h1>
            <p>Podrás abrirlo cuando recuperes la conexión.</p>
            <a href="/offline" className="button secondary">
              Volver a las citas
            </a>
          </main>
        )
      ) : profile ? (
        snapshot.profile ? (
          <main className="page profile-page">
            <ProfileView
              profile={snapshot.profile}
              achievements={snapshot.achievements}
              scope={scope}
              completed={snapshot.dates.filter((d) => d.completed).length}
              total={100 + snapshot.dates.filter((d) => d.isCustom).length}
            />
          </main>
        ) : (
          <main className="page status-screen">
            <h1>El perfil aún no está guardado</h1>
            <a href="/offline">Volver a las citas</a>
          </main>
        )
      ) : (
        <DateGrid
          dates={snapshot.dates}
          greeting={`${snapshot.account.name} y ${snapshot.couple.partner?.name || 'tu pareja'}`}
          scope={scope}
          readonly
        />
      )}
      <nav className="bottom-nav" aria-label="Recuerdos guardados">
        <a href="/offline" aria-current={!selection && !profile ? 'page' : undefined}>
          <BookHeart size={23} />
          <span>Citas</span>
        </a>
        <a href="/offline#%2Fprofile" aria-current={profile ? 'page' : undefined}>
          <UserRound size={23} />
          <span>Nosotros</span>
        </a>
      </nav>
    </div>
  );
}
