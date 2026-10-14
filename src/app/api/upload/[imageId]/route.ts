export const runtime = 'nodejs';
import { requireAuth, requireCouple } from '@/lib/auth-middleware';
import { db } from '@/db';
import { coupleDates, customDateImages, customDates, dateImages } from '@/db/schema';
import { handleApiError } from '@/lib/db-errors';
import { isUuid } from '@/lib/date-id';
import { deleteImagesLater } from '@/lib/r2';
import { eq } from 'drizzle-orm';

export async function DELETE(request: Request, context: { params: Promise<{ imageId: string }> }) {
  const { imageId } = await context.params;
  try {
    const { userId } = await requireAuth(request);
    const { coupleId } = await requireCouple(userId);
    if (!isUuid(imageId)) {
      return Response.json({ error: 'Imagen no encontrada' }, { status: 404 });
    }

    const catalogRows = await db
      .select({ image: dateImages, coupleDate: coupleDates })
      .from(dateImages)
      .innerJoin(coupleDates, eq(dateImages.coupleDateId, coupleDates.id))
      .where(eq(dateImages.id, imageId))
      .limit(1);

    if (catalogRows.length > 0) {
      if (catalogRows[0].coupleDate.coupleId !== coupleId) {
        return Response.json({ error: 'Sin permisos' }, { status: 403 });
      }

      await db.delete(dateImages).where(eq(dateImages.id, imageId));
      deleteImagesLater([catalogRows[0].image.url]);
      return Response.json({ success: true });
    }

    const customRows = await db
      .select({ image: customDateImages, customDate: customDates })
      .from(customDateImages)
      .innerJoin(customDates, eq(customDateImages.customDateId, customDates.id))
      .where(eq(customDateImages.id, imageId))
      .limit(1);

    if (customRows.length === 0) {
      return Response.json({ error: 'Imagen no encontrada' }, { status: 404 });
    }

    if (customRows[0].customDate.coupleId !== coupleId) {
      return Response.json({ error: 'Sin permisos' }, { status: 403 });
    }

    await db.delete(customDateImages).where(eq(customDateImages.id, imageId));
    deleteImagesLater([customRows[0].image.url]);

    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
