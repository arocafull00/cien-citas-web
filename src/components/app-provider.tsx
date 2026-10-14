'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { apiClient, ApiError } from '@/lib/api-client';
import {
  beginContext,
  clearPrivateData,
  currentGeneration,
  readSnapshot,
  saveSnapshot,
} from '@/lib/offline';
import type {
  Account,
  Couple,
  DateEntry,
  DateDetail,
  Snapshot,
  Profile,
  Achievement,
} from '@/lib/types';

type AppState = {
  account: Account | null;
  couple: Couple | null;
  dates: DateEntry[];
  loading: boolean;
  online: boolean;
  error: string | null;
  scope: string;
  updatedAt: string | null;
  refresh: () => Promise<void>;
  getDetail: (id: string) => Promise<DateDetail>;
  rememberDetail: (date: DateDetail) => void;
  signOut: () => Promise<void>;
  reset: () => Promise<void>;
  rememberProfile: (profile: Profile, achievements: Achievement[], scope: string) => void;
  clearSavedMemories: () => Promise<void>;
};
const Context = createContext<AppState | null>(null);
export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error('AppProvider requerido');
  return value;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { userId, isLoaded } = useAuth();
  const clerk = useClerk();
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [dates, setDates] = useState<DateEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const snapshot = useRef<Snapshot | null>(null);
  const identity = useRef<string | null | undefined>(undefined);
  const requestEpoch = useRef(0);
  const lastRefreshAt = useRef(0);

  const reset = useCallback(async () => {
    ++requestEpoch.current;
    snapshot.current = null;
    setAccount(null);
    setCouple(null);
    setDates([]);
    setUpdatedAt(null);
    await clearPrivateData();
  }, []);
  const clearSavedMemories = useCallback(async () => {
    ++requestEpoch.current;
    snapshot.current = null;
    setUpdatedAt(null);
    await clearPrivateData();
  }, []);

  const refresh = useCallback(async () => {
    if (!isLoaded || !userId) {
      setLoading(false);
      return;
    }
    const epoch = ++requestEpoch.current;
    lastRefreshAt.current = Date.now();
    let gen = currentGeneration();
    let verifiedCouple: Couple | undefined;
    setError(null);
    const fetchDates = () =>
      apiClient.get<{ dates: DateEntry[] }>('/api/dates', { fresh: true }).then(
        (value) => ({ value }),
        (error: unknown) => ({ error }),
      );
    const earlyDates = snapshot.current?.couple.partner ? fetchDates() : null;
    try {
      const [accountResult, coupleResult] = await Promise.all([
        apiClient.get<{ account: Account }>('/api/account', { fresh: true }),
        apiClient.get<{ couple: Couple | null }>('/api/couples/me', { fresh: true }),
      ]);
      if (epoch !== requestEpoch.current) return;
      if (!coupleResult.couple?.partner) {
        await clearPrivateData({ preserveProfileSetup: true });
        if (epoch !== requestEpoch.current) return;
        snapshot.current = null;
        setAccount(accountResult.account);
        setCouple(null);
        setDates([]);
        return;
      }
      verifiedCouple = coupleResult.couple;
      const stored = await readSnapshot(userId);
      const previous =
        snapshot.current?.couple.id === verifiedCouple.id
          ? snapshot.current
          : stored?.couple.id === verifiedCouple.id
            ? stored
            : null;
      if (epoch !== requestEpoch.current) return;
      if (
        (snapshot.current && snapshot.current.couple.id !== verifiedCouple.id) ||
        (stored && stored.couple.id !== verifiedCouple.id)
      ) {
        snapshot.current = null;
        setDates([]);
        await clearPrivateData();
        gen = currentGeneration();
      }
      setAccount(accountResult.account);
      setCouple(coupleResult.couple);
      const listResult = await (earlyDates ?? fetchDates());
      if ('error' in listResult) throw listResult.error;
      const list = listResult.value;
      if (epoch !== requestEpoch.current) return;
      const next: Snapshot = {
        account: accountResult.account,
        couple: coupleResult.couple,
        dates: list.dates,
        details: snapshot.current?.details || previous?.details || {},
        profile: snapshot.current?.profile || previous?.profile || null,
        achievements: snapshot.current?.achievements || previous?.achievements || [],
        updatedAt: new Date().toISOString(),
      };
      snapshot.current = next;
      setDates((previous) => {
        const byId = new Map(previous.map((date) => [date.id, date]));
        const stable = next.dates.map((date) => {
          const old = byId.get(date.id);
          return old &&
            (Object.keys(date) as (keyof DateEntry)[]).every((key) => old[key] === date[key])
            ? old
            : date;
        });
        return previous.length === stable.length &&
          previous.every((date, index) => date === stable[index])
          ? previous
          : stable;
      });
      setUpdatedAt(next.updatedAt);
      void saveSnapshot(next, gen).catch(() =>
        setError('No hay espacio para guardar los recuerdos sin conexión.'),
      );
    } catch (failure) {
      if (epoch !== requestEpoch.current) return;
      if (failure instanceof ApiError && [401, 403].includes(failure.status)) {
        await reset();
        router.replace(failure.status === 401 ? '/login' : '/onboarding');
        return;
      }
      const saved = await readSnapshot(userId, verifiedCouple?.id);
      if (epoch !== requestEpoch.current) return;
      if (saved) {
        snapshot.current = saved;
        setAccount(saved.account);
        setCouple(saved.couple);
        setDates(saved.dates);
        setUpdatedAt(saved.updatedAt);
      }
      setError(failure instanceof Error ? failure.message : 'No pudimos cargar vuestros recuerdos');
    } finally {
      if (epoch === requestEpoch.current) setLoading(false);
    }
  }, [isLoaded, userId, reset, router]);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    const channel = new BroadcastChannel('100citas-session');
    channel.onmessage = () => {
      void reset().then(() => router.replace('/login'));
    };
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
      channel.close();
    };
  }, [reset, router]);

  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;
    async function bootstrap() {
      if (identity.current !== userId) {
        ++requestEpoch.current;
        beginContext();
        snapshot.current = null;
        setAccount(null);
        setCouple(null);
        setDates([]);
        setLoading(Boolean(userId));
        identity.current = userId;
        const saved = await readSnapshot();
        if (cancelled) return;
        if (!userId || (saved && saved.account.clerkUserId !== userId)) await clearPrivateData();
        else if (saved?.couple.partner) {
          snapshot.current = saved;
          setAccount(saved.account);
          setCouple(saved.couple);
          setDates(saved.dates);
          setUpdatedAt(saved.updatedAt);
          setLoading(false);
        }
      }
      if (!cancelled) await refresh();
    }
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, userId, refresh, reset]);

  useEffect(() => {
    if (!online || !userId) return;
    const focus = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastRefreshAt.current > 30_000)
        void refresh();
    };
    const reconnect = () => void refresh();
    window.addEventListener('online', reconnect);
    document.addEventListener('visibilitychange', focus);
    return () => {
      window.removeEventListener('online', reconnect);
      document.removeEventListener('visibilitychange', focus);
    };
  }, [online, userId, refresh]);

  const rememberDetail = useCallback((date: DateDetail) => {
    const current = snapshot.current;
    if (!current) return;
    const next = {
      ...current,
      details: { ...current.details, [date.id]: date },
      updatedAt: new Date().toISOString(),
    };
    snapshot.current = next;
    void saveSnapshot(next, currentGeneration()).catch(() => {});
  }, []);

  const getDetail = useCallback(
    async (id: string) => {
      const gen = currentGeneration();
      try {
        const { date } = await apiClient.get<{ date: DateDetail }>(`/api/dates/${id}`);
        if (gen !== currentGeneration()) throw new Error('La sesión ha cambiado');
        rememberDetail(date);
        return date;
      } catch (failure) {
        if (
          !(failure instanceof ApiError) &&
          gen === currentGeneration() &&
          snapshot.current?.details[id]
        )
          return snapshot.current.details[id];
        throw failure;
      }
    },
    [rememberDetail],
  );

  const signOut = useCallback(async () => {
    await reset();
    const channel = new BroadcastChannel('100citas-session');
    channel.postMessage('logout');
    channel.close();
    await clerk.signOut({ redirectUrl: '/login' });
  }, [clerk, reset]);
  const rememberProfile = useCallback(
    (profile: Profile, achievements: Achievement[], expectedScope: string) => {
      const current = snapshot.current;
      if (!current || `${current.account.clerkUserId}:${current.couple.id}` !== expectedScope)
        return;
      const next = { ...current, profile, achievements };
      snapshot.current = next;
      void saveSnapshot(next, currentGeneration()).catch(() => {});
    },
    [],
  );
  const scope = couple && userId ? `${userId}:${couple.id}` : '';
  const value = useMemo(
    () => ({
      account,
      couple,
      dates,
      loading,
      error,
      online,
      updatedAt,
      scope,
      refresh,
      getDetail,
      rememberDetail,
      rememberProfile,
      signOut,
      reset,
      clearSavedMemories,
    }),
    [
      account,
      couple,
      dates,
      loading,
      error,
      online,
      updatedAt,
      scope,
      refresh,
      getDetail,
      rememberDetail,
      rememberProfile,
      signOut,
      reset,
      clearSavedMemories,
    ],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
