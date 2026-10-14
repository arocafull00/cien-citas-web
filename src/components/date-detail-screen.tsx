'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import type { DateDetail } from '@/lib/types';
import { useApp } from './app-provider';
import { DateDetailView } from './date-detail';
import { ConfirmDialog } from './ui';
export function DateDetailScreen({ id }: { id: string }) {
  const { getDetail, scope, online, refresh, rememberDetail } = useApp();
  const [date, setDate] = useState<DateDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<'undo' | 'delete' | null>(null);
  const router = useRouter();
  useEffect(() => {
    let cancelled = false;
    void getDetail(id)
      .then((value) => {
        if (!cancelled) setDate(value);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [id, getDetail]);
  const mutate = useCallback(async () => {
    if (!date) return;
    setBusy(true);
    setError(null);
    try {
      if (confirm === 'delete') {
        await apiClient.delete(`/api/dates/${id}`);
        await refresh();
        router.replace('/dates');
      } else {
        await apiClient.patch(`/api/dates/${id}`, { completed: false });
        const next = await getDetail(id);
        setDate(next);
        rememberDetail(next);
        await refresh();
      }
      setConfirm(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  }, [date, confirm, id, refresh, router, getDetail, rememberDetail]);
  if (!date)
    return (
      <main className="page status-screen">
        {error ? (
          <>
            <h1>No pudimos abrir esta cita</h1>
            <p role="alert">{error}</p>
            <a href="/dates">Volver a las citas</a>
          </>
        ) : (
          <span className="spinner" />
        )}
      </main>
    );
  return (
    <>
      {error ? (
        <p className="error-message" role="alert">
          {error}
        </p>
      ) : null}
      <DateDetailView
        date={date}
        scope={scope}
        readonly={!online}
        undo={() => setConfirm('undo')}
        remove={() => setConfirm('delete')}
        busy={busy}
      />
      {confirm ? (
        <ConfirmDialog
          title={confirm === 'delete' ? '¿Eliminar esta cita?' : '¿Marcar como pendiente?'}
          description={
            confirm === 'delete'
              ? 'Se eliminarán la cita y sus fotos. No podrás deshacerlo.'
              : 'Se borrarán la fecha, las notas, la ubicación y las fotos del recuerdo.'
          }
          confirmLabel={confirm === 'delete' ? 'Eliminar cita' : 'Marcar como pendiente'}
          busy={busy}
          onConfirm={() => void mutate()}
          onClose={() => setConfirm(null)}
        />
      ) : null}
    </>
  );
}
