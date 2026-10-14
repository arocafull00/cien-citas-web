export const runtime = 'nodejs';
import { requireAuth, requireCouple } from '@/lib/auth-middleware';
import { handleApiError } from '@/lib/db-errors';
import { db } from '@/db';
import { users, couples, coupleDates, customDates, dateIdeas } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { storageKey } from '@/lib/storage-key';

export async function GET(request: Request) {
  try {
    const { userId } = await requireAuth(request);
    const { coupleId, partnerId } = await requireCouple(userId);

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    const [coupleRow] = await db.select().from(couples).where(eq(couples.id, coupleId)).limit(1);

    let partnerName: string | null = null;
    let partnerAvatarUrl: string | null = null;
    if (partnerId) {
      const [partner] = await db
        .select({ name: users.name, avatarUrl: users.avatarUrl })
        .from(users)
        .where(eq(users.id, partnerId))
        .limit(1);
      partnerName = partner?.name ?? null;
      partnerAvatarUrl = partner?.avatarUrl ?? null;
    }

    const [catalogCompleted, customCompleted] = await Promise.all([
      db
        .select({
          category: sql<string>`coalesce(${coupleDates.customCategory}, ${dateIdeas.category})`,
          completedAt: coupleDates.completedAt,
        })
        .from(coupleDates)
        .innerJoin(dateIdeas, eq(coupleDates.dateId, dateIdeas.id))
        .where(and(eq(coupleDates.coupleId, coupleId), eq(coupleDates.completed, true))),
      db
        .select({ category: customDates.category, completedAt: customDates.completedAt })
        .from(customDates)
        .where(and(eq(customDates.coupleId, coupleId), eq(customDates.completed, true))),
    ]);
    const completed = [...catalogCompleted, ...customCompleted];
    const totalCompleted = completed.length;
    const categoriesCompleted = new Set(completed.map((date) => date.category)).size;
    const timestamps = completed.flatMap((date) =>
      date.completedAt ? [date.completedAt.getTime()] : [],
    );
    const daysActive = timestamps.length
      ? Math.max(0, Math.floor((Date.now() - Math.min(...timestamps)) / 86_400_000))
      : 0;

    return Response.json({
      user: {
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        notifyPartnerActivity: user.notifyPartnerActivity,
        createdAt: user.createdAt,
      },
      couple: {
        id: coupleId,
        joinedAt: coupleRow.createdAt,
        partnerName,
        partnerAvatarUrl,
      },
      stats: {
        totalCompleted,
        categoriesCompleted,
        daysActive,
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(request: Request) {
  try {
    const { userId } = await requireAuth(request);
    const body = (await request.json()) as {
      name?: string;
      avatarUrl?: string;
      notifyPartnerActivity?: boolean;
    };
    const patch: {
      name?: string;
      avatarUrl?: string;
      notifyPartnerActivity?: boolean;
    } = {};

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length > 80)
        return Response.json({ error: 'Nombre inválido' }, { status: 400 });
      const trimmed = body.name.trim();
      if (!trimmed) {
        return Response.json({ error: 'El nombre no puede estar vacío' }, { status: 400 });
      }
      patch.name = trimmed;
    }

    if (body.avatarUrl !== undefined) {
      if (
        typeof body.avatarUrl !== 'string' ||
        !storageKey(body.avatarUrl, process.env.R2_PUBLIC_URL || '')?.startsWith(
          `avatars/${userId}/`,
        )
      )
        return Response.json({ error: 'URL de avatar inválida' }, { status: 400 });
      const trimmed = body.avatarUrl.trim();
      if (!trimmed) {
        return Response.json({ error: 'URL de avatar inválida' }, { status: 400 });
      }
      patch.avatarUrl = trimmed;
    }

    if (body.notifyPartnerActivity !== undefined) {
      if (typeof body.notifyPartnerActivity !== 'boolean')
        return Response.json({ error: 'Preferencia inválida' }, { status: 400 });
      patch.notifyPartnerActivity = body.notifyPartnerActivity;
    }

    if (Object.keys(patch).length === 0) {
      return Response.json({ error: 'Nada que actualizar' }, { status: 400 });
    }

    await db.update(users).set(patch).where(eq(users.id, userId));

    return Response.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
