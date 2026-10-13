import { db } from '@/db';
import { coupleAchievements } from '@/db/schema';
import { backfillCoupleAchievements } from '@/lib/achievements/backfill';
import { eq } from 'drizzle-orm';

export async function reconcileCoupleAchievements(coupleId: string) {
  await db.delete(coupleAchievements).where(eq(coupleAchievements.coupleId, coupleId));
  await backfillCoupleAchievements(coupleId);
}
