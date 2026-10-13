import { db } from '@/db';
import { customDateImages, dateImages } from '@/db/schema';
import { deleteFromStorage } from '@/lib/r2-delete';
import { eq } from 'drizzle-orm';

export async function clearCatalogDateCompletion(coupleDateId: string) {
  const imgRows = await db
    .select({ url: dateImages.url })
    .from(dateImages)
    .where(eq(dateImages.coupleDateId, coupleDateId));

  for (const img of imgRows) {
    await deleteFromStorage(img.url);
  }

  await db.delete(dateImages).where(eq(dateImages.coupleDateId, coupleDateId));
}

export async function clearCustomDateCompletion(customDateId: string) {
  const imgRows = await db
    .select({ url: customDateImages.url })
    .from(customDateImages)
    .where(eq(customDateImages.customDateId, customDateId));

  for (const img of imgRows) {
    await deleteFromStorage(img.url);
  }

  await db.delete(customDateImages).where(eq(customDateImages.customDateId, customDateId));
}

export const COMPLETION_RESET_FIELDS = {
  completed: false,
  completedAt: null,
  locationName: null,
  locationLat: null,
  locationLng: null,
  notes: null,
} as const;
