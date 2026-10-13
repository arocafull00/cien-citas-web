export const runtime = "nodejs";
import { requireAuth, requireCouple } from '@/lib/auth-middleware';
import { db } from '@/db';
import { achievements, coupleAchievements } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { userId } = await requireAuth(request);
    const { coupleId } = await requireCouple(userId);

    const rows = await db
      .select({
        id: achievements.id,
        title: achievements.title,
        description: achievements.description,
        iconSet: achievements.iconSet,
        iconName: achievements.iconName,
        unlockedAt: coupleAchievements.unlockedAt,
      })
      .from(achievements)
      .leftJoin(
        coupleAchievements,
        and(
          eq(coupleAchievements.achievementId, achievements.id),
          eq(coupleAchievements.coupleId, coupleId),
        ),
      )
      .orderBy(asc(achievements.sortOrder));

    return Response.json({
      achievements: rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        iconSet: row.iconSet,
        iconName: row.iconName,
        unlocked: row.unlockedAt != null,
        unlockedAt: row.unlockedAt?.toISOString() ?? null,
      })),
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
}
