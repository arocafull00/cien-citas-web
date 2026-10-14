export const runtime = 'nodejs';
import { requireAuth } from '@/lib/auth-middleware';
import { handleApiError } from '@/lib/db-errors';
import { isImageContentType, isValidImageSize } from '@/lib/image-rules';
import { presignImageUpload, uploadKey } from '@/lib/r2';
import { readJsonObject } from '@/lib/request-body';

export async function POST(request: Request) {
  try {
    const { userId } = await requireAuth(request);
    const { filename, contentType, size } = await readJsonObject(request);
    if (typeof filename !== 'string' || !filename) {
      return Response.json(
        { error: 'Parámetros requeridos: filename, contentType, size' },
        { status: 400 },
      );
    }
    if (!isImageContentType(contentType)) {
      return Response.json({ error: 'Elige una foto JPG, PNG, WebP o HEIC.' }, { status: 400 });
    }
    if (!isValidImageSize(size)) {
      return Response.json({ error: 'Cada foto puede ocupar hasta 15 MB.' }, { status: 400 });
    }
    return Response.json(
      await presignImageUpload(uploadKey(`avatars/${userId}`, filename), contentType, size),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
