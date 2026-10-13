import { db } from '@/db';
import { coupleAchievements } from '@/db/schema';

export async function unlockAchievement(
  coupleId: string,
  achievementId: string,
  unlockedAt: Date = new Date(),
) {
  await db
    .insert(coupleAchievements)
    .values({
      coupleId,
      achievementId,
      unlockedAt,
    })
    .onConflictDoNothing({
      target: [coupleAchievements.coupleId, coupleAchievements.achievementId],
    });
}
