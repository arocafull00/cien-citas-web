import type { DateDifficulty } from '@/constants/dates';

export const DIFFICULTIES: DateDifficulty[] = ['fácil', 'medio', 'difícil'];
export const TEXT_LIMITS = { title: 200, description: 6000, notes: 10000, locationName: 500 };
const CLOCK_SKEW_MS = 24 * 60 * 60 * 1000;

export type DatePatch = {
  completed?: boolean;
  completedAt?: string | null;
  locationName?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  notes?: string | null;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  difficulty?: string | null;
  customTitle?: string | null;
  customDescription?: string | null;
  customCategory?: string | null;
  customDifficulty?: string | null;
};

type Result = { value: DatePatch; error?: undefined } | { value?: undefined; error: string };

function isText(value: unknown, max: number) {
  return (
    value === undefined || value === null || (typeof value === 'string' && value.length <= max)
  );
}

function isCoordinate(value: unknown, limit: number) {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit)
  );
}

export function parseDatePatch(body: Record<string, unknown>, now = Date.now()): Result {
  if (body.completed !== undefined && typeof body.completed !== 'boolean') {
    return { error: 'Estado de la cita inválido' };
  }
  const { completedAt } = body;
  if (completedAt !== undefined && completedAt !== null) {
    const time = typeof completedAt === 'string' ? Date.parse(completedAt) : NaN;
    if (Number.isNaN(time)) return { error: 'Fecha inválida' };
    if (time > now + CLOCK_SKEW_MS) return { error: 'La fecha no puede ser futura' };
  }
  if (!isText(body.locationName, TEXT_LIMITS.locationName)) return { error: 'Lugar inválido' };
  if (!isCoordinate(body.locationLat, 90) || !isCoordinate(body.locationLng, 180)) {
    return { error: 'Coordenadas inválidas' };
  }
  if (!isText(body.notes, TEXT_LIMITS.notes)) return { error: 'Las notas son demasiado largas' };
  if (!isText(body.title, TEXT_LIMITS.title) || !isText(body.customTitle, TEXT_LIMITS.title)) {
    return { error: 'Título inválido' };
  }
  if (
    !isText(body.description, TEXT_LIMITS.description) ||
    !isText(body.customDescription, TEXT_LIMITS.description)
  ) {
    return { error: 'Descripción inválida' };
  }
  for (const field of ['category', 'difficulty', 'customCategory', 'customDifficulty']) {
    if (!isText(body[field], 40)) return { error: 'Datos de la cita inválidos' };
  }
  return { value: body as DatePatch };
}
