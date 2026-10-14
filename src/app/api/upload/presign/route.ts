export const runtime = "nodejs";
import { requireAuth, requireCouple } from '@/lib/auth-middleware';
import { db } from '@/db';
import { coupleDates, customDates } from '@/db/schema';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { eq, and } from 'drizzle-orm';

function getS3Client(): S3Client {
  return new S3Client({
    region: 'auto',
    // The browser supplies the body later; do not sign a checksum of an empty file.
    requestChecksumCalculation: 'WHEN_REQUIRED',
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
    const { coupleId } = await requireCouple(userId);

    const { filename, contentType, coupleDateId, customDateId } = await request.json() as {
      filename: string;
      contentType: string;
      coupleDateId?: string;
      customDateId?: string;
    };

    if (!filename || !contentType || (!coupleDateId && !customDateId)) {
      return Response.json(
        { error: 'Parámetros requeridos: filename, contentType, coupleDateId o customDateId' },
        { status: 400 },
      );
    }

    let storageId: string;

    if (customDateId) {
      const cdRow = await db
        .select()
        .from(customDates)
        .where(and(eq(customDates.id, customDateId), eq(customDates.coupleId, coupleId)))
        .limit(1);

      if (cdRow.length === 0) {
        return Response.json({ error: 'Cita no encontrada o sin permisos' }, { status: 403 });
      }

      storageId = customDateId;
    } else {
      const cdRow = await db
        .select()
        .from(coupleDates)
        .where(and(eq(coupleDates.id, coupleDateId!), eq(coupleDates.coupleId, coupleId)))
        .limit(1);

      if (cdRow.length === 0) {
        return Response.json({ error: 'Cita no encontrada o sin permisos' }, { status: 403 });
      }

      storageId = coupleDateId!;
    }

    const timestamp = Date.now();
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const prefix = customDateId ? 'custom' : 'catalog';
    const key = `${coupleId}/${prefix}/${storageId}/${timestamp}-${safeFilename}`;

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
