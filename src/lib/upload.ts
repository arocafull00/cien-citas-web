import { apiClient } from './api-client';
import { isImageContentType, MAX_IMAGE_BYTES } from './image-rules';

const SMALL_ENOUGH = 1.5 * 1024 * 1024;

export function validateImage(file: File) {
  if (!isImageContentType(file.type)) throw new Error('Elige una foto JPG, PNG, WebP o HEIC.');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Cada foto puede ocupar hasta 15 MB.');
}

function encode(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
}

export async function prepareImage(file: File, maxSide: number): Promise<File> {
  const displayable = file.type !== 'image/heic' && file.type !== 'image/heif';
  if (displayable && file.size <= SMALL_ENOUGH) return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  try {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await encode(canvas);
    if (!blob || (displayable && blob.size >= file.size)) return file;
    return new File([blob], file.name.replace(/\.[^.]*$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  } finally {
    bitmap.close();
  }
}

export async function uploadImage(original: File, target?: { id: string; isCustom: boolean }) {
  validateImage(original);
  const file = await prepareImage(original, target ? 2048 : 1024);
  const body = {
    filename: file.name,
    contentType: file.type,
    size: file.size,
    ...(target
      ? target.isCustom
        ? { customDateId: target.id }
        : { coupleDateId: target.id }
      : {}),
  };
  const { presignedUrl, publicUrl } = await apiClient.post<{
    presignedUrl: string;
    publicUrl: string;
  }>(target ? '/api/upload/presign' : '/api/profile/avatar-presign', body);
  let response: Response;
  try {
    response = await fetch(presignedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });
  } catch {
    throw new Error(
      'No se pudo conectar con el almacenamiento de fotos. Puedes volver a intentarlo.',
    );
  }
  if (!response.ok) throw new Error('No se pudo subir la foto. Puedes volver a intentarlo.');
  if (!target) {
    await apiClient.patch('/api/profile/me', { avatarUrl: publicUrl });
    return { id: 'avatar', url: publicUrl };
  }
  const { imageId } = await apiClient.post<{ imageId: string }>('/api/upload/confirm', {
    ...(target.isCustom ? { customDateId: target.id } : { coupleDateId: target.id }),
    url: publicUrl,
  });
  return { id: imageId, url: publicUrl };
}
