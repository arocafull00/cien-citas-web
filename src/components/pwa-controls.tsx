'use client';
import { Button } from '@/components/ui/button';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Download, RefreshCw } from 'lucide-react';
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
const subscribeInstall = (listener: () => void) => {
  const media = matchMedia('(display-mode: standalone)');
  media.addEventListener('change', listener);
  window.addEventListener('appinstalled', listener);
  return () => {
    media.removeEventListener('change', listener);
    window.removeEventListener('appinstalled', listener);
  };
};
export function PwaControls() {
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const ios = useSyncExternalStore(
    subscribeInstall,
    () =>
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !matchMedia('(display-mode: standalone)').matches,
    () => false,
  );
  const [help, setHelp] = useState(false);
  const [update, setUpdate] = useState<ServiceWorker | null>(null);
  useEffect(() => {
    const handle = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallEvent);
    };
    const installed = () => {
      setInstall(null);
    };
    window.addEventListener('beforeinstallprompt', handle);
    window.addEventListener('appinstalled', installed);
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      void navigator.serviceWorker.ready.then((reg) => {
        if (reg.waiting && navigator.serviceWorker.controller) setUpdate(reg.waiting);
        reg.addEventListener('updatefound', () => {
          const worker = reg.installing;
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller)
              setUpdate(worker);
          });
        });
      });
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', handle);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);
  return (
    <aside className="pwa-controls">
      {update ? (
        <Button
          variant="ghost"
          size="unstyled"
          className="text-button"
          onClick={() => {
            navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), {
              once: true,
            });
            update.postMessage({ type: 'SKIP_WAITING' });
          }}
        >
          <RefreshCw size={15} /> Nueva versión · Actualizar
        </Button>
      ) : null}
      {install ? (
        <Button
          variant="ghost"
          size="unstyled"
          className="text-button"
          onClick={async () => {
            await install.prompt();
            await install.userChoice;
            setInstall(null);
          }}
        >
          <Download size={15} /> Instalar 100 Citas
        </Button>
      ) : null}
      {ios ? (
        <Button
          variant="ghost"
          size="unstyled"
          className="text-button"
          onClick={() => setHelp(!help)}
        >
          <Download size={15} /> Añadir a la pantalla de inicio
        </Button>
      ) : null}
      {help ? <p>En Safari, pulsa Compartir y después «Añadir a la pantalla de inicio».</p> : null}
    </aside>
  );
}
