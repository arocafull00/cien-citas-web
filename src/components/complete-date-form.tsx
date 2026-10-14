'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, X, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { persistCompletedDate } from '@/lib/persist-completed-date';
import { uploadImage, validateImage } from '@/lib/upload';
import type { DateDetail } from '@/lib/types';
import { useApp } from './app-provider';
import { BackHeader } from './mobile-shell';
import { LocationPicker } from './location-picker';
import { CachedImage } from './cached-image';
import { ConfirmDialog } from './ui';
type Photo = {
  key: string;
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
};
export function localDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function CompleteDateForm({ id }: { id: string }) {
  const { getDetail, rememberDetail, scope, refresh, online } = useApp();
  const router = useRouter();
  const [date, setDate] = useState<DateDetail | null>(null);
  const [day, setDay] = useState(localDateInput(new Date()));
  const [location, setLocation] = useState({
    name: '',
    lat: null as number | null,
    lng: null as number | null,
  });
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remove, setRemove] = useState<string | null>(null);
  const [completionSaved, setCompletionSaved] = useState(false);
  const completionTime = useRef(new Date());
  const previewUrls = useRef(new Set<string>());
  useEffect(() => {
    let cancelled = false;
    void getDetail(id)
      .then((d) => {
        if (cancelled) return;
        setDate(d);
        completionTime.current = d.completedAt ? new Date(d.completedAt) : new Date();
        setDay(localDateInput(d.completedAt ? new Date(d.completedAt) : new Date()));
        setLocation({ name: d.locationName || '', lat: d.locationLat, lng: d.locationLng });
        setNotes(d.notes || '');
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [id, getDetail]);
  useEffect(() => {
    const urls = previewUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);
  function addPhotos(files: FileList | null) {
    if (!files) return;
    try {
      const selected = Array.from(files);
      if (
        (date?.images.length || 0) +
          photos.filter((photo) => photo.status !== 'done').length +
          selected.length >
        10
      )
        throw new Error('Máximo 10 fotos por cita');
      selected.forEach(validateImage);
      setPhotos((current) => [
        ...current,
        ...selected.map((file) => {
          const preview = URL.createObjectURL(file);
          previewUrls.current.add(preview);
          return { key: crypto.randomUUID(), file, preview, status: 'pending' as const };
        }),
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Foto no válida');
    }
  }
  async function save(skipPhotos = false) {
    if (!date) return;
    if (!day || day > localDateInput(new Date())) {
      setError('La fecha no puede ser futura');
      return;
    }
    if (location.name.trim() && (location.lat === null || location.lng === null)) {
      setError('Elige un lugar en el mapa o de la lista de sugerencias.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const target = await persistCompletedDate(id, date.coupleDateId || undefined, {
        completed: true,
        completedAt: new Date(
          `${day}T${completionTime.current.toTimeString().slice(0, 8)}`,
        ).toISOString(),
        locationName: location.name.trim() || null,
        locationLat: location.lat,
        locationLng: location.lng,
        notes: notes || null,
      });
      setCompletionSaved(true);
      let failures = 0;
      if (!skipPhotos)
        for (const photo of photos.filter((p) => p.status !== 'done')) {
          setPhotos((items) =>
            items.map((p) =>
              p.key === photo.key ? { ...p, status: 'uploading', error: undefined } : p,
            ),
          );
          try {
            await uploadImage(photo.file, { id: target, isCustom: date.isCustom });
            setPhotos((items) =>
              items.map((p) => (p.key === photo.key ? { ...p, status: 'done' } : p)),
            );
          } catch (e) {
            ++failures;
            setPhotos((items) =>
              items.map((p) =>
                p.key === photo.key
                  ? {
                      ...p,
                      status: 'error',
                      error: e instanceof Error ? e.message : 'No se pudo subir',
                    }
                  : p,
              ),
            );
          }
        }
      const next = await getDetail(id);
      setDate(next);
      rememberDetail(next);
      await refresh();
      if (failures) {
        setError(
          'El recuerdo se ha guardado, pero faltan fotos. Puedes reintentarlas o continuar.',
        );
        return;
      }
      router.replace(!date.completed && id === '100' ? '/celebration' : `/date/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el recuerdo');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <BackHeader
        title={date?.completed ? 'Editar nuestro recuerdo' : 'Un recuerdo para siempre'}
        back={`/date/${id}`}
      />
      <main className="page form-page">
        {error ? (
          <p role="alert" className="error-message">
            {error}
          </p>
        ) : null}
        {date ? (
          <>
            <h2 className="form-date-title">{date.title}</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              <fieldset disabled={busy || !online}>
                <label className="field">
                  Cuándo lo vivimos
                  <Input
                    type="date"
                    required
                    max={localDateInput(new Date())}
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                  />
                </label>
                <LocationPicker
                  value={location}
                  onChange={setLocation}
                  disabled={busy || !online}
                />
                <label className="field">
                  Lo que queremos recordar
                  <Textarea
                    value={notes}
                    maxLength={10000}
                    rows={5}
                    placeholder="Ese pequeño detalle que no queremos olvidar…"
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </label>
                <h3>
                  Nuestras fotos (
                  {date.images.length + photos.filter((photo) => photo.status !== 'done').length}
                  /10)
                </h3>
                <div className="upload-grid">
                  {date.images.map((image) => (
                    <div key={image.id} className="upload-preview">
                      <CachedImage
                        src={image.url}
                        alt="Recuerdo guardado"
                        scope={scope}
                        variant="thumbnail"
                        loading="lazy"
                      />
                      <Button
                        variant="plain"
                        type="button"
                        aria-label="Eliminar foto"
                        onClick={() => setRemove(image.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  ))}
                  {photos
                    .filter((photo) => photo.status !== 'done')
                    .map((photo) => (
                      <div key={photo.key} className="upload-preview">
                        <img src={photo.preview} alt={photo.file.name} />
                        <span className={`upload-status ${photo.status}`}>
                          {photo.status === 'uploading'
                            ? 'Subiendo…'
                            : photo.status === 'error'
                              ? 'Reintentar'
                              : 'Nueva'}
                        </span>
                        <Button
                          variant="plain"
                          type="button"
                          aria-label={`Quitar ${photo.file.name}`}
                          onClick={() =>
                            setPhotos((items) => items.filter((p) => p.key !== photo.key))
                          }
                        >
                          <X size={16} />
                        </Button>
                        {photo.error ? <span className="upload-error">{photo.error}</span> : null}
                      </div>
                    ))}
                </div>
                <label className="photo-upload">
                  <Camera size={22} />
                  <span>Añadir fotos</span>
                  <Input
                    disabled={
                      date.images.length +
                        photos.filter((photo) => photo.status !== 'done').length >=
                      10
                    }
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                    onChange={(e) => {
                      addPhotos(e.target.files);
                      e.target.value = '';
                    }}
                  />
                </label>
              </fieldset>
              <div className="form-submit">
                <Button variant="primary" disabled={busy || !online}>
                  {busy
                    ? 'Guardando vuestro recuerdo…'
                    : photos.some((p) => p.status === 'error')
                      ? 'Reintentar fotos pendientes'
                      : 'Guardar nuestro recuerdo'}
                </Button>
              </div>
            </form>
            {completionSaved && photos.some((p) => p.status === 'error') ? (
              <Button variant="text" disabled={busy || !online} onClick={() => void save(true)}>
                Continuar con las fotos guardadas
              </Button>
            ) : null}
            {!online ? (
              <p className="connection-notice">Necesitas conexión para guardar este recuerdo.</p>
            ) : null}
          </>
        ) : (
          <p>Cargando cita…</p>
        )}
      </main>
      {remove ? (
        <ConfirmDialog
          title="¿Eliminar esta foto?"
          description="Se eliminará del recuerdo compartido."
          confirmLabel="Eliminar foto"
          busy={busy}
          onClose={() => setRemove(null)}
          onConfirm={() => {
            setBusy(true);
            void apiClient
              .delete(`/api/upload/${remove}`)
              .then(async () => {
                const next = await getDetail(id);
                setDate(next);
                rememberDetail(next);
                await refresh();
              })
              .catch((e) => setError(e.message))
              .finally(() => {
                setRemove(null);
                setBusy(false);
              });
          }}
        />
      ) : null}
    </>
  );
}
