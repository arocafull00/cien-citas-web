import { apiClient } from './api-client';
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
export function validateImage(file: File) {
  if (!ALLOWED.includes(file.type)) throw new Error('Elige una foto JPG, PNG, WebP o HEIC.');
  if (file.size > 15 * 1024 * 1024) throw new Error('Cada foto puede ocupar hasta 15 MB.');
}
export async function uploadImage(file: File, target?: { id: string; isCustom: boolean }) {
  validateImage(file);
  const body = { filename: file.name, contentType: file.type, ...(target ? target.isCustom ? { customDateId: target.id } : { coupleDateId: target.id } : {}) };
  const { presignedUrl, publicUrl } = await apiClient.post<{ presignedUrl: string; publicUrl: string }>(target ? '/api/upload/presign' : '/api/profile/avatar-presign', body);
  const response = await fetch(presignedUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
  if (!response.ok) throw new Error('No se pudo subir la foto. Puedes volver a intentarlo.');
  if (!target) { await apiClient.patch('/api/profile/me', { avatarUrl: publicUrl }); return { id: 'avatar', url: publicUrl }; }
  const { imageId } = await apiClient.post<{ imageId: string }>('/api/upload/confirm', { ...(target.isCustom ? { customDateId: target.id } : { coupleDateId: target.id }), url: publicUrl });
  return { id: imageId, url: publicUrl };
}
