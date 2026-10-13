export const runtime = "nodejs";
import { requireAuth, requireCouple } from '@/lib/auth-middleware';
import { evaluateAfterPhotoAdded } from '@/lib/achievements/evaluate';
import { db } from '@/db';
import { coupleDates, customDateImages, customDates, dateImages } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { storageKey } from '@/lib/storage-key';

export async function POST(request: Request) {
  try {
    const { userId } = await requireAuth(request);
    const { coupleId } = await requireCouple(userId);

    const { coupleDateId, customDateId, url } = await request.json() as {
      coupleDateId?: string;
      customDateId?: string;
      url: string;
    };

    if (!url || (!coupleDateId && !customDateId)) {
      return Response.json(
        { error: 'Parámetros requeridos: url, coupleDateId o customDateId' },
        { status: 400 },
      );
    }

    const key = typeof url === 'string' && process.env.R2_PUBLIC_URL ? storageKey(url, process.env.R2_PUBLIC_URL) : null;
    const expectedPrefix = customDateId ? `${coupleId}/custom/${customDateId}/` : `${coupleId}/catalog/${coupleDateId}/`;
    if (!key?.startsWith(expectedPrefix)) return Response.json({ error: 'Imagen no válida para esta cita' }, { status: 403 });

    if (customDateId) {
      const cdRow = await db
        .select()
        .from(customDates)
        .where(and(eq(customDates.id, customDateId), eq(customDates.coupleId, coupleId)))
        .limit(1);

      if (cdRow.length === 0) {
        return Response.json({ error: 'Cita no encontrada o sin permisos' }, { status: 403 });
      }

      const [image] = await db
        .insert(customDateImages)
        .values({ customDateId, url })
        .returning();

      await evaluateAfterPhotoAdded(coupleId);

      return Response.json({ imageId: image.id }, { status: 201 });
    }

    const cdRow = await db
      .select()
      .from(coupleDates)
      .where(and(eq(coupleDates.id, coupleDateId!), eq(coupleDates.coupleId, coupleId)))
      .limit(1);

    if (cdRow.length === 0) {
      return Response.json({ error: 'Cita no encontrada o sin permisos' }, { status: 403 });
    }

    const [image] = await db
      .insert(dateImages)
      .values({ coupleDateId: coupleDateId!, url })
      .returning();

    await evaluateAfterPhotoAdded(coupleId);

    return Response.json({ imageId: image.id }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
}
