'use client';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ArrowLeft, BookHeart, UserRound } from 'lucide-react';
import { useApp } from './app-provider';

export function MobileLink({ href, children, ...props }: React.ComponentProps<typeof Link>) {
  return (
    <Link
      href={href}
      {...props}
      onClick={(event) => {
        props.onClick?.(event);
        // A full navigation loads the precached offline document without an RSC request.
        if (!event.defaultPrevented && !navigator.onLine) {
          event.preventDefault();
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.assign(`/offline#${encodeURIComponent(String(href))}`);
        }
      }}
    >
      {children}
    </Link>
  );
}
export function BackHeader({
  title,
  back = '/dates',
  action,
}: {
  title: string;
  back?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="back-header">
      <MobileLink className="icon-button" href={back} aria-label="Volver">
        <ArrowLeft size={22} />
      </MobileLink>
      <h1>{title}</h1>
      {action || <span className="header-spacer" />}
    </header>
  );
}
export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      <MobileLink href="/dates" aria-current={path === '/dates' ? 'page' : undefined}>
        <BookHeart size={23} />
        <span>Citas</span>
      </MobileLink>
      <MobileLink href="/profile" aria-current={path === '/profile' ? 'page' : undefined}>
        <UserRound size={23} />
        <span>Nosotros</span>
      </MobileLink>
    </nav>
  );
}
export function ConnectionNotice() {
  const { online, error, updatedAt, refresh } = useApp();
  if (online && !error) return null;
  return (
    <div className="connection-notice" role="status">
      <span>
        {!online ? 'Sin conexión · Solo lectura' : error}
        {updatedAt ? (
          <small>Guardado el {new Date(updatedAt).toLocaleString('es-ES')}</small>
        ) : null}
      </span>
      {online ? (
        <Button variant="ghost" size="unstyled" onClick={() => void refresh()}>
          Reintentar
        </Button>
      ) : (
        <a href="/offline">Abrir recuerdos</a>
      )}
    </div>
  );
}
export function CoupleGate({ children }: { children: React.ReactNode }) {
  const { loading, couple, account, error, online, refresh } = useApp();
  const router = useRouter();
  useEffect(() => {
    if (!loading && account && !couple?.partner && !error && online) router.replace('/onboarding');
  }, [loading, account, couple, error, online, router]);
  if (loading)
    return (
      <main className="page status-screen">
        <span className="spinner" />
        <p>Abriendo vuestro diario…</p>
      </main>
    );
  if (!couple?.partner)
    return (
      <main className="page status-screen">
        <h1>{error ? 'No pudimos conectar' : 'Preparando vuestra historia'}</h1>
        {error ? (
          <>
            <p>{error}</p>
            <Button
              variant="ghost"
              size="unstyled"
              className="button"
              onClick={() => void refresh()}
            >
              Reintentar
            </Button>
            <a href="/offline">Consultar recuerdos guardados</a>
          </>
        ) : (
          <p>Un momento…</p>
        )}
      </main>
    );
  return (
    <>
      <ConnectionNotice />
      {children}
    </>
  );
}
