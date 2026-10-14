export const IMAGE_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
export const MAX_PHOTOS_PER_DATE = 10;

export function isImageContentType(value: unknown): value is (typeof IMAGE_CONTENT_TYPES)[number] {
  return typeof value === 'string' && (IMAGE_CONTENT_TYPES as readonly string[]).includes(value);
}

export function isValidImageSize(value: unknown): value is number {
  return (
    typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= MAX_IMAGE_BYTES
  );
}
