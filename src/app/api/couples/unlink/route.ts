export const runtime = 'nodejs';
import { requireAuth, requireCouple } from '@/lib/auth-middleware';
import { db } from '@/db';
import {
  coupleAchievements,
  coupleDates,
  couples,
  customDateImages,
  customDates,
  dateImages,
} from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';

export async function DELETE(request: Request) {
  try {
    const { userId } = await requireAuth(request);
    const { coupleId } = await requireCouple(userId);

    const customDateRows = await db
      .select({ id: customDates.id })
      .from(customDates)
      .where(eq(customDates.coupleId, coupleId));

    const customDateIds = customDateRows.map((row) => row.id);

    if (customDateIds.length > 0) {
      await db
        .delete(customDateImages)
        .where(inArray(customDateImages.customDateId, customDateIds));
      await db.delete(customDates).where(eq(customDates.coupleId, coupleId));
    }

    const dateRows = await db
      .select({ id: coupleDates.id })
      .from(coupleDates)
      .where(eq(coupleDates.coupleId, coupleId));

    const dateIds = dateRows.map((row) => row.id);

    if (dateIds.length > 0) {
      await db.delete(dateImages).where(inArray(dateImages.coupleDateId, dateIds));
      await db.delete(coupleDates).where(eq(coupleDates.coupleId, coupleId));
    }

    await db.delete(coupleAchievements).where(eq(coupleAchievements.coupleId, coupleId));

    await db.delete(couples).where(eq(couples.id, coupleId));

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
}
