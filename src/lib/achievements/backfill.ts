import { evaluateAfterDateCompleted, evaluateAfterPhotoAdded } from '@/lib/achievements/evaluate';

export async function backfillCoupleAchievements(coupleId: string) {
  await evaluateAfterDateCompleted(coupleId);
  await evaluateAfterPhotoAdded(coupleId);
}
