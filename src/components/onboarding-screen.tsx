'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Copy, Share2, ArrowRight, Camera } from 'lucide-react';
import { useApp } from './app-provider';
import { apiClient } from '@/lib/api-client';
import { uploadImage } from '@/lib/upload';
import { clearPrivateData } from '@/lib/offline';

export function OnboardingScreen() {
  const { account, loading, error, refresh, signOut } = useApp();
  if (!account)
    return (
      <main className="page status-screen">
        {loading ? (
          <>
            <span className="spinner" />
            <p>Preparando vuestra historia…</p>
          </>
        ) : (
          <>
            <h1>No pudimos abrir tu cuenta</h1>
            <p>{error}</p>
            <Button
              variant="ghost"
              size="unstyled"
              className="button"
              onClick={() => void refresh()}
            >
              Reintentar
            </Button>
            <Button
              variant="ghost"
              size="unstyled"
              className="text-button"
              onClick={() => void signOut()}
            >
              Salir
            </Button>
          </>
        )}
      </main>
    );
  return <OnboardingFlow key={account.id} />;
}
function OnboardingFlow() {
  const { account, couple, loading, refresh, signOut, online, error: appError } = useApp();
  const router = useRouter();
  const [step, setPhase] = useState<'profile' | 'choice' | 'create' | 'join' | 'connected'>(() =>
    localStorage.getItem(`100citas:profile:${account!.clerkUserId}`) ? 'choice' : 'profile',
  );
  const phase = couple?.partner ? 'connected' : step;
  const [name, setName] = useState(account!.name);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [code, setCode] = useState('');
  const [invite, setInvite] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const existingCouple = useRef(Boolean(couple?.partner));
  useEffect(() => {
    if (existingCouple.current) router.replace('/dates');
  }, [router]);
  useEffect(() => {
    if (phase !== 'create' || !online) return;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 3000);
    return () => clearInterval(timer);
  }, [phase, online, refresh]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo completar la operación');
    } finally {
      setBusy(false);
    }
  }
  if (loading && !account)
    return (
      <main className="page status-screen">
        <span className="spinner" />
        <p>Preparando vuestra historia…</p>
      </main>
    );
  return (
    <main className="page onboarding-page">
      <div className="login-top">
        <span className="eyebrow">VUESTRO PRIMER PASO</span>
        <Button
          variant="ghost"
          size="unstyled"
          className="text-button"
          onClick={() => void signOut()}
        >
          Salir
        </Button>
      </div>
      <div className="onboarding-symbol">
        <Heart size={42} strokeWidth={1} />
      </div>
      {phase === 'profile' ? (
        <>
          <h1>¿Cómo te llamas?</h1>
          <p className="intro">Así empieza vuestra historia.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                if (!name.trim()) throw new Error('Escribe tu nombre');
                await apiClient.patch('/api/profile/me', { name: name.trim() });
                if (avatar) await uploadImage(avatar);
                if (account)
                  localStorage.setItem(`100citas:profile:${account.clerkUserId}`, 'true');
                await refresh();
                setPhase('choice');
              });
            }}
          >
            <label className="avatar-picker">
              <Camera size={24} />
              <span>{avatar?.name || 'Añadir una foto'}</span>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                onChange={(e) => setAvatar(e.target.files?.[0] || null)}
              />
            </label>
            <label className="field">
              Tu nombre
              <Input
                required
                maxLength={80}
                autoComplete="given-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <Button variant="ghost" size="unstyled" className="button" disabled={busy || !online}>
              Continuar <ArrowRight size={18} />
            </Button>
          </form>
        </>
      ) : null}
      {phase === 'choice' ? (
        <>
          <h1>Conecta con tu pareja</h1>
          <p className="intro">Un diario, dos protagonistas.</p>
          <Button
            variant="ghost"
            size="unstyled"
            className="choice-card"
            disabled={busy || !online}
            onClick={() =>
              void run(async () => {
                const result = await apiClient.post<{ code: string }>('/api/couples/create', {});
                setCode(result.code);
                setPhase('create');
              })
            }
          >
            <Heart size={26} />
            <strong>Crear pareja</strong>
            <span>Comparte vuestro código y empezad juntos.</span>
          </Button>
          <div className="ornament">♡</div>
          <Button
            variant="ghost"
            size="unstyled"
            className="choice-card"
            onClick={() => setPhase('join')}
          >
            <strong>Tengo un código</strong>
            <span>Únete a la historia que ya os espera.</span>
          </Button>
        </>
      ) : null}
      {phase === 'create' ? (
        <>
          <h1>Un código para dos</h1>
          <p className="intro">Envíaselo a tu pareja para conectar vuestras cuentas.</p>
          <div className="invite-code">{code}</div>
          <div className="button-row">
            <Button
              variant="ghost"
              size="unstyled"
              className="button secondary"
              onClick={() =>
                void run(async () => {
                  await navigator.clipboard.writeText(code);
                  setNotice('Código copiado');
                })
              }
            >
              <Copy size={18} />
              Copiar
            </Button>
            <Button
              variant="ghost"
              size="unstyled"
              className="button secondary"
              onClick={() =>
                void run(async () => {
                  if (navigator.share)
                    await navigator.share({
                      title: '100 Citas',
                      text: `Nuestro código para 100 Citas: ${code}`,
                    });
                  else {
                    await navigator.clipboard.writeText(code);
                    setNotice('Código copiado para compartir');
                  }
                })
              }
            >
              <Share2 size={18} />
              Compartir
            </Button>
          </div>
          <p className="waiting">Esperando a tu pareja…</p>
          <Button
            variant="ghost"
            size="unstyled"
            className="text-button"
            onClick={() => setPhase('choice')}
          >
            Volver
          </Button>
        </>
      ) : null}
      {phase === 'join' ? (
        <>
          <h1>Vuestra historia continúa aquí</h1>
          <p className="intro">Escribe el código que te ha enviado tu pareja.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await clearPrivateData();
                await apiClient.post('/api/couples/join', {
                  inviteCode: invite.trim().toUpperCase(),
                });
                await refresh();
                setPhase('connected');
              });
            }}
          >
            <label className="field">
              Código de invitación
              <Input
                className="code-input"
                autoComplete="off"
                required
                minLength={6}
                maxLength={6}
                value={invite}
                onChange={(e) => setInvite(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              />
            </label>
            <Button
              variant="ghost"
              size="unstyled"
              className="button"
              disabled={busy || invite.length !== 6 || !online}
            >
              Unirme
            </Button>
          </form>
          <Button
            variant="ghost"
            size="unstyled"
            className="text-button"
            onClick={() => setPhase('choice')}
          >
            Volver
          </Button>
        </>
      ) : null}
      {phase === 'connected' ? (
        <>
          <h1>¡Ya estáis conectados!</h1>
          <p className="intro">
            {account?.name} y {couple?.partner?.name}, tenéis 100 momentos por vivir.
          </p>
          <div className="connected-hearts">
            <Heart size={58} />
            <Heart size={58} />
          </div>
          <Button
            variant="ghost"
            size="unstyled"
            className="button"
            onClick={() => router.replace('/dates')}
          >
            Empezar nuestra historia <ArrowRight size={18} />
          </Button>
        </>
      ) : null}
      {error || appError ? (
        <p role="alert" className="error-message">
          {error || appError}
        </p>
      ) : null}
      {notice ? <p role="status">{notice}</p> : null}
      {!online ? (
        <p className="connection-notice">Necesitas conexión para vincular vuestra pareja.</p>
      ) : null}
    </main>
  );
}
