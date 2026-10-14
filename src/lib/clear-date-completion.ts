import { db } from '@/db';
import { customDateImages, dateImages } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function clearCatalogDateCompletion(coupleDateId: string) {
  const rows = await db
    .delete(dateImages)
    .where(eq(dateImages.coupleDateId, coupleDateId))
    .returning({ url: dateImages.url });
  return rows.map((row) => row.url);
}

export async function clearCustomDateCompletion(customDateId: string) {
  const rows = await db
    .delete(customDateImages)
    .where(eq(customDateImages.customDateId, customDateId))
    .returning({ url: customDateImages.url });
  return rows.map((row) => row.url);
}

export const COMPLETION_RESET_FIELDS = {
  completed: false,
  completedAt: null,
  locationName: null,
  locationLat: null,
  locationLng: null,
  notes: null,
} as const;
