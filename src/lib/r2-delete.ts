import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

function getS3Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export async function deleteFromStorage(url: string) {
  const publicUrl = process.env.R2_PUBLIC_URL ?? '';
  const key = url.replace(`${publicUrl}/`, '');

  const s3 = getS3Client();
  await s3.send(
    new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }),
  );
}
