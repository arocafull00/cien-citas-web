export const runtime = "nodejs";
import { requireAuth } from '@/lib/auth-middleware';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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

export async function POST(request: Request) {
  try {
    const { userId } = await requireAuth(request);

    const { filename, contentType } = (await request.json()) as {
      filename: string;
      contentType: string;
    };

    if (!filename || !contentType) {
      return Response.json(
        { error: 'Parámetros requeridos: filename, contentType' },
        { status: 400 },
      );
    }

    const timestamp = Date.now();
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `avatars/${userId}/${timestamp}-${safeFilename}`;

    const s3 = getS3Client();
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

    return Response.json({ presignedUrl, publicUrl, key });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
}
