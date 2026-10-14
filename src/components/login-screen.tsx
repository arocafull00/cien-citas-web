'use client';
import { Button } from '@/components/ui/button';
import { useClerk, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { ArrowRight, Heart } from 'lucide-react';
import { ONBOARDING_SLIDES } from '@/constants/onboarding';
import { useApp } from './app-provider';
const subscribe = (listener: () => void) => {
  window.addEventListener('storage', listener);
  return () => window.removeEventListener('storage', listener);
};

export function LoginScreen() {
  const seen = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem('100citas:onboarding') === 'seen',
    () => false,
  );
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clerk = useClerk();
  const { isSignedIn } = useAuth();
  const { account, couple, loading, error: appError } = useApp();
  const router = useRouter();
  useEffect(() => {
    if (isSignedIn && account && !loading && !appError)
      router.replace(couple ? '/dates' : '/onboarding');
  }, [isSignedIn, account, couple, loading, appError, router]);

  async function signIn() {
    if (!clerk.loaded || !clerk.client) return;
    setBusy(true);
    setError(null);
    localStorage.setItem('100citas:onboarding', 'seen');
    try {
      await clerk.client.signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/onboarding',
      });
    } catch {
      setError('No pudimos iniciar sesión. Vuelve a intentarlo.');
      setBusy(false);
    }
  }

  const slide = ONBOARDING_SLIDES[index];
  const last = seen || index === ONBOARDING_SLIDES.length - 1;
  return (
    <main className="login-page">
      {!seen ? (
        <div className="login-top">
          <span className="eyebrow">NUESTRA HISTORIA</span>
          {!last ? (
            <Button variant="text" onClick={() => setIndex(ONBOARDING_SLIDES.length - 1)}>
              Saltar
            </Button>
          ) : null}
        </div>
      ) : null}
      <div
        className={`onboarding-visual ${!seen ? slide.kind : 'welcome'}`}
        key={seen ? 'welcome' : index}
      >
        {seen || slide.kind === 'partners' ? (
          <img
            className="login-hero"
            src="/images/login-header.webp"
            alt="Recuerdos de nuestra historia"
          />
        ) : null}
        {!seen && slide.kind === 'polaroid' ? (
          <div className="polaroid">
            <img src={slide.heroImage} alt="Una historia que empieza juntos" />
            <span>El principio de algo bonito ♡</span>
          </div>
        ) : null}
        {!seen && slide.kind === 'bento' ? (
          <div className="bento-grid">
            <img src={slide.mainImage} alt="Sabores para compartir" />
            <img src={slide.adventureImage} alt="Aventuras juntos" />
            <img src={slide.spaThumb} alt="Tiempo para vosotros" />
            <img src={slide.travelThumb} alt="Nuevos destinos" />
          </div>
        ) : null}
        {!seen && slide.kind === 'scrapbook' ? (
          <>
            <div className="polaroid tilted">
              <img src={slide.heroImage} alt="Un recuerdo junto al río" />
              <span>{slide.memoryDate}</span>
            </div>
            <p className="handwritten">{slide.memoryQuote}</p>
          </>
        ) : null}
        {!seen && slide.kind === 'progress' ? (
          <div className="onboarding-progress">
            <Heart size={44} strokeWidth={1} />
            <strong>
              {slide.completed}
              <span> / {slide.total}</span>
            </strong>
            <p>Citas que ya son recuerdos</p>
            <div className="progress-track">
              <span style={{ width: `${(slide.completed / slide.total) * 100}%` }} />
            </div>
            <img src={slide.doneCardImage} alt="Un día juntos en la playa" />
          </div>
        ) : null}
      </div>
      <div className="login-copy">
        <h1>
          {seen ? (
            'Bienvenidos de vuelta'
          ) : (
            <>
              {slide.title}
              {slide.kind === 'polaroid' ? <em>{slide.titleHighlight}</em> : null}
            </>
          )}
        </h1>
        <p>{seen ? 'Inicia sesión y vive aventuras junto a tu pareja' : slide.description}</p>
      </div>
      <div className="login-actions">
        {!seen ? (
          <div className="dots" aria-label={`Pantalla ${index + 1} de ${ONBOARDING_SLIDES.length}`}>
            {ONBOARDING_SLIDES.map((_, i) => (
              <Button
                variant="plain"
                key={i}
                aria-label={`Ir a pantalla ${i + 1}`}
                aria-current={i === index ? 'step' : undefined}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        ) : null}
        {error || appError ? (
          <p role="alert" className="error-message">
            {error || appError}
          </p>
        ) : null}
        {last ? (
          <Button
            variant="primary"
            className="google-button"
            disabled={busy || !clerk.loaded}
            onClick={() => void signIn()}
          >
            <span className="google-g" aria-hidden="true">
              G
            </span>
            {busy ? 'Conectando…' : 'Continuar con Google'}
          </Button>
        ) : (
          <Button variant="primary" onClick={() => setIndex((i) => i + 1)}>
            Continuar <ArrowRight size={18} />
          </Button>
        )}
        <p className="love-quote">«Un amor que se cuida, crece.»</p>
        <div id="clerk-captcha" />
      </div>
    </main>
  );
}
