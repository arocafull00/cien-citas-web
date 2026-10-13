export const runtime = "nodejs";
import { requireAuth, requireCouple } from '@/lib/auth-middleware';
import { handleApiError } from '@/lib/db-errors';
import { db } from '@/db';
import { users, couples, coupleDates } from '@/db/schema';
import { eq, and, count, min } from 'drizzle-orm';
import { storageKey } from '@/lib/storage-key';

export async function GET(request: Request) {
  try {
    const { userId } = await requireAuth(request);
    const { coupleId, partnerId } = await requireCouple(userId);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const [coupleRow] = await db
      .select()
      .from(couples)
      .where(eq(couples.id, coupleId))
      .limit(1);

    let partnerName: string | null = null;
    if (partnerId) {
      const [partner] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, partnerId))
        .limit(1);
      partnerName = partner?.name ?? null;
    }

    const [stats] = await db
      .select({
        totalCompleted: count(coupleDates.id),
        firstCompletedAt: min(coupleDates.completedAt),
      })
      .from(coupleDates)
      .where(and(eq(coupleDates.coupleId, coupleId), eq(coupleDates.completed, true)));

    const totalCompleted = Number(stats.totalCompleted ?? 0);
    const firstDate = stats.firstCompletedAt ? new Date(stats.firstCompletedAt) : null;
    const daysActive = firstDate
      ? Math.floor((Date.now() - firstDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const allCompleted = await db
      .select({ category: coupleDates.dateId })
      .from(coupleDates)
      .where(and(eq(coupleDates.coupleId, coupleId), eq(coupleDates.completed, true)));

    const categoriesCompleted = new Set(allCompleted.map((r) => r.category)).size;

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
      if (typeof body.name !== 'string' || body.name.trim().length > 80) return Response.json({ error: 'Nombre inválido' }, { status: 400 });
      const trimmed = body.name.trim();
      if (!trimmed) {
        return Response.json({ error: 'El nombre no puede estar vacío' }, { status: 400 });
      }
      patch.name = trimmed;
    }

    if (body.avatarUrl !== undefined) {
      if (typeof body.avatarUrl !== 'string' || !storageKey(body.avatarUrl, process.env.R2_PUBLIC_URL || '')?.startsWith(`avatars/${userId}/`)) return Response.json({ error: 'URL de avatar inválida' }, { status: 400 });
      const trimmed = body.avatarUrl.trim();
      if (!trimmed) {
        return Response.json({ error: 'URL de avatar inválida' }, { status: 400 });
      }
      patch.avatarUrl = trimmed;
    }

    if (body.notifyPartnerActivity !== undefined) {
      if (typeof body.notifyPartnerActivity !== 'boolean') return Response.json({ error: 'Preferencia inválida' }, { status: 400 });
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
