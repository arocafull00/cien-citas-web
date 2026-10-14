'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DATE_CATEGORIES } from '@/constants/dates';
import { apiClient } from '@/lib/api-client';
import type { DateDetail, DateEntry } from '@/lib/types';
import { BackHeader } from './mobile-shell';
import { useApp } from './app-provider';
import { ConfirmDialog } from './ui';
export function DateForm({ id }: { id?: string }) {
  const { getDetail, refresh, online, rememberDetail } = useApp();
  const router = useRouter();
  const [date, setDate] = useState<DateDetail | null>(null);
  const [form, setForm] = useState({ title: '', description: '', category: '', difficulty: '' });
  const [ready, setReady] = useState(!id);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reset, setReset] = useState(false);
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void getDetail(id)
      .then((d) => {
        if (!cancelled) {
          setDate(d);
          setForm({
            title: d.title,
            description: d.description,
            category: d.category,
            difficulty: d.difficulty,
          });
          setReady(true);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [id, getDetail]);
  async function save() {
    setBusy(true);
    setError(null);
    try {
      let target = id;
      if (id) {
        await apiClient.patch(`/api/dates/${id}`, form);
        rememberDetail(await getDetail(id));
      } else {
        const { date: created } = await apiClient.post<{ date: DateEntry }>(
          '/api/custom-dates',
          form,
        );
        target = created.id;
      }
      await refresh();
      router.replace(`/date/${target}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <BackHeader
        title={id ? 'Personaliza vuestra cita' : 'Una cita muy vuestra'}
        back={id ? `/date/${id}` : '/dates'}
      />
      <main className="page form-page">
        <p className="intro">
          {id
            ? 'Haz de esta idea un plan que hable de vosotros.'
            : 'Hay momentos que solo vosotros podéis imaginar.'}
        </p>
        {error ? (
          <p role="alert" className="error-message">
            {error}
          </p>
        ) : null}
        {ready ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <fieldset disabled={busy || !online}>
              <label className="field">
                Título
                <Input
                  required
                  maxLength={200}
                  value={form.title}
                  placeholder="Nuestro próximo plan"
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </label>
              <label className="field">
                Descripción
                <Textarea
                  required
                  rows={5}
                  maxLength={6000}
                  value={form.description}
                  placeholder="¿Qué os apetece vivir juntos?"
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </label>
              <label className="field">
                Categoría
                <select
                  required
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  <option value="" disabled>
                    Elige una categoría
                  </option>
                  {DATE_CATEGORIES.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Dificultad
                <select
                  required
                  value={form.difficulty}
                  onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                >
                  <option value="" disabled>
                    Elige la dificultad
                  </option>
                  {['fácil', 'medio', 'difícil'].map((difficulty) => (
                    <option key={difficulty}>{difficulty}</option>
                  ))}
                </select>
              </label>
            </fieldset>
            <div className="form-submit">
              <Button variant="primary" disabled={busy || !online}>
                {busy ? 'Guardando…' : id ? 'Guardar cambios' : 'Crear nuestra cita'}
              </Button>
            </div>
          </form>
        ) : (
          <p>Cargando cita…</p>
        )}
        {date?.isCustomized && !date.isCustom ? (
          <Button variant="text" disabled={busy || !online} onClick={() => setReset(true)}>
            Restaurar la idea original
          </Button>
        ) : null}
        {!online ? (
          <p className="connection-notice">Necesitas conexión para guardar cambios.</p>
        ) : null}
      </main>
      {reset ? (
        <ConfirmDialog
          title="¿Restaurar la idea original?"
          description="Se restaurarán título, descripción, categoría y dificultad. Vuestros recuerdos se conservarán."
          confirmLabel="Restaurar"
          busy={busy}
          onClose={() => setReset(false)}
          onConfirm={() => {
            setBusy(true);
            void apiClient
              .patch(`/api/dates/${id}`, {
                customTitle: null,
                customDescription: null,
                customCategory: null,
                customDifficulty: null,
              })
              .then(async () => {
                await refresh();
                router.replace(`/date/${id}`);
              })
              .catch((e) => setError(e.message))
              .finally(() => {
                setBusy(false);
                setReset(false);
              });
          }}
        />
      ) : null}
    </>
  );
}
