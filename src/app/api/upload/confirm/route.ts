export const runtime = 'nodejs';
import { after } from 'next/server';
import { requireAuth, requireCouple } from '@/lib/auth-middleware';
import { evaluateAfterPhotoAdded } from '@/lib/achievements/evaluate';
import { db } from '@/db';
import { customDateImages, dateImages } from '@/db/schema';
import { handleApiError } from '@/lib/db-errors';
import { findPhotoTarget, photoLimitResponse } from '@/lib/date-photos';
import { MAX_PHOTOS_PER_DATE } from '@/lib/image-rules';
import { deleteImages, keyFromUrl } from '@/lib/r2';
import { readJsonObject } from '@/lib/request-body';
import { generateThumbnail } from '@/lib/thumbnails';

export async function POST(request: Request) {
  try {
    const { userId } = await requireAuth(request);
    const { coupleId } = await requireCouple(userId);
    const body = await readJsonObject(request);
    const { url } = body;
    if (typeof url !== 'string' || !url || (!body.coupleDateId && !body.customDateId)) {
      return Response.json(
        { error: 'Parámetros requeridos: url, coupleDateId o customDateId' },
        { status: 400 },
      );
    }

    const target = await findPhotoTarget(coupleId, body);
    if (!target) {
      return Response.json({ error: 'Cita no encontrada o sin permisos' }, { status: 403 });
    }
    const key = keyFromUrl(url);
    if (!key?.startsWith(`${target.prefix}/`)) {
      return Response.json({ error: 'Imagen no válida para esta cita' }, { status: 403 });
    }
    if (target.photos >= MAX_PHOTOS_PER_DATE) {
      after(() => deleteImages([url]).catch((error) => console.error(error)));
      return photoLimitResponse();
    }

    const [image] =
      target.kind === 'custom'
        ? await db.insert(customDateImages).values({ customDateId: target.id, url }).returning()
        : await db.insert(dateImages).values({ coupleDateId: target.id, url }).returning();

    await evaluateAfterPhotoAdded(coupleId);
    after(() => generateThumbnail(key));
    return Response.json({ imageId: image.id }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
