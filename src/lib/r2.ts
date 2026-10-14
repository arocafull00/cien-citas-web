import 'server-only';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { after } from 'next/server';
import { storageKey } from '@/lib/storage-key';

let client: S3Client | undefined;

function r2() {
  client ??= new S3Client({
    region: 'auto',
    // The browser supplies the body later; do not sign a checksum of an empty file.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  return client;
}

export function publicUrlFor(key: string) {
  return `${process.env.R2_PUBLIC_URL?.replace(/\/$/, '')}/${key}`;
}

export function keyFromUrl(url: string) {
  return process.env.R2_PUBLIC_URL ? storageKey(url, process.env.R2_PUBLIC_URL) : null;
}

export function thumbnailKey(key: string) {
  return `${key}.thumb.webp`;
}

export function uploadKey(prefix: string, filename: string) {
  return `${prefix}/${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
}

export async function presignImageUpload(key: string, contentType: string, size: number) {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    ContentLength: size,
  });
  const presignedUrl = await getSignedUrl(r2(), command, {
    expiresIn: 300,
    signableHeaders: new Set(['content-type', 'content-length']),
  });
  return { presignedUrl, publicUrl: publicUrlFor(key), key };
}

export async function putObject(key: string, body: Uint8Array, contentType: string) {
  await r2().send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function deleteImages(urls: string[]) {
  const keys = urls.map(keyFromUrl).filter((key): key is string => Boolean(key));
  await Promise.all(
    keys
      .flatMap((key) => [key, thumbnailKey(key)])
      .map((Key) =>
        r2().send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key })),
      ),
  );
}

export function deleteImagesLater(urls: string[]) {
  if (urls.length === 0) return;
  after(() => deleteImages(urls).catch((error) => console.error('[r2] delete failed', error)));
}
