import 'server-only';
import { and, count, eq } from 'drizzle-orm';
import { db } from '@/db';
import { coupleDates, customDateImages, customDates, dateImages } from '@/db/schema';
import { isUuid } from '@/lib/date-id';
import { MAX_PHOTOS_PER_DATE } from '@/lib/image-rules';

export type PhotoTarget = {
  kind: 'catalog' | 'custom';
  id: string;
  prefix: string;
  photos: number;
};

export async function findPhotoTarget(
  coupleId: string,
  body: Record<string, unknown>,
): Promise<PhotoTarget | null> {
  const customDateId = typeof body.customDateId === 'string' ? body.customDateId : undefined;
  const coupleDateId = typeof body.coupleDateId === 'string' ? body.coupleDateId : undefined;
  const id = customDateId ?? coupleDateId;
  if (!id || !isUuid(id)) return null;

  if (customDateId) {
    const [row] = await db
      .select({ id: customDates.id, photos: count(customDateImages.id) })
      .from(customDates)
      .leftJoin(customDateImages, eq(customDateImages.customDateId, customDates.id))
      .where(and(eq(customDates.id, id), eq(customDates.coupleId, coupleId)))
      .groupBy(customDates.id);
    return row
      ? { kind: 'custom', id, prefix: `${coupleId}/custom/${id}`, photos: Number(row.photos) }
      : null;
  }

  const [row] = await db
    .select({ id: coupleDates.id, photos: count(dateImages.id) })
    .from(coupleDates)
    .leftJoin(dateImages, eq(dateImages.coupleDateId, coupleDates.id))
    .where(and(eq(coupleDates.id, id), eq(coupleDates.coupleId, coupleId)))
    .groupBy(coupleDates.id);
  return row
    ? { kind: 'catalog', id, prefix: `${coupleId}/catalog/${id}`, photos: Number(row.photos) }
    : null;
}

export function photoLimitResponse() {
  return Response.json({ error: `Máximo ${MAX_PHOTOS_PER_DATE} fotos por cita` }, { status: 409 });
}
