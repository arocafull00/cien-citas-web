export const runtime = 'nodejs';
import { requireAuth, requireCouple } from '@/lib/auth-middleware';
import { handleApiError } from '@/lib/db-errors';
import { findPhotoTarget, photoLimitResponse } from '@/lib/date-photos';
import { isImageContentType, isValidImageSize, MAX_PHOTOS_PER_DATE } from '@/lib/image-rules';
import { presignImageUpload, uploadKey } from '@/lib/r2';
import { readJsonObject } from '@/lib/request-body';

export async function POST(request: Request) {
  try {
    const { userId } = await requireAuth(request);
    const { coupleId } = await requireCouple(userId);
    const body = await readJsonObject(request);
    const { filename, contentType, size } = body;

    if (typeof filename !== 'string' || !filename || (!body.coupleDateId && !body.customDateId)) {
      return Response.json(
        {
          error: 'Parámetros requeridos: filename, contentType, size, coupleDateId o customDateId',
        },
        { status: 400 },
      );
    }
    if (!isImageContentType(contentType)) {
      return Response.json({ error: 'Elige una foto JPG, PNG, WebP o HEIC.' }, { status: 400 });
    }
    if (!isValidImageSize(size)) {
      return Response.json({ error: 'Cada foto puede ocupar hasta 15 MB.' }, { status: 400 });
    }

    const target = await findPhotoTarget(coupleId, body);
    if (!target) {
      return Response.json({ error: 'Cita no encontrada o sin permisos' }, { status: 403 });
    }
    if (target.photos >= MAX_PHOTOS_PER_DATE) return photoLimitResponse();

    return Response.json(
      await presignImageUpload(uploadKey(target.prefix, filename), contentType, size),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
