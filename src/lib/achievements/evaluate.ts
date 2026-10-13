import { db } from '@/db';
import { coupleDates, customDateImages, customDates, dateIdeas, dateImages } from '@/db/schema';
import { eq, and, count } from 'drizzle-orm';
import { ACHIEVEMENT_IDS, ALL_DATE_CATEGORIES } from '@/lib/achievements/constants';
import { unlockAchievement } from '@/lib/achievements/unlock';

type CompletedEntry = {
  completedAt: Date | null;
  dateId?: number;
};

async function loadCompletedCustomRows(coupleId: string) {
  try {
    return await db
      .select()
      .from(customDates)
      .where(and(eq(customDates.coupleId, coupleId), eq(customDates.completed, true)));
  } catch (e) {
    console.error('[achievements] custom_dates query failed', e);
    return [];
  }
}

async function loadCompletedDates(coupleId: string): Promise<CompletedEntry[]> {
  const catalogRows = await db
    .select()
    .from(coupleDates)
    .where(and(eq(coupleDates.coupleId, coupleId), eq(coupleDates.completed, true)));

  const customRows = await loadCompletedCustomRows(coupleId);

  return [
    ...catalogRows.map((r) => ({ completedAt: r.completedAt, dateId: r.dateId })),
    ...customRows.map((r) => ({ completedAt: r.completedAt })),
  ];
}

async function loadCategoryCounts(coupleId: string) {
  const completedCatalog = await db
    .select()
    .from(coupleDates)
    .where(and(eq(coupleDates.coupleId, coupleId), eq(coupleDates.completed, true)));

  const completedCustom = await loadCompletedCustomRows(coupleId);

  if (completedCatalog.length === 0 && completedCustom.length === 0) {
    return {} as Record<string, number>;
  }

  const ideaCategories = await db
    .select({ id: dateIdeas.id, category: dateIdeas.category })
    .from(dateIdeas);
  const categoryByDateId = new Map(ideaCategories.map((r) => [r.id, r.category]));

  const acc: Record<string, number> = {};

  for (const row of completedCatalog) {
    const cat = row.customCategory ?? categoryByDateId.get(row.dateId);
    if (!cat) continue;
    acc[cat] = (acc[cat] ?? 0) + 1;
  }

  for (const row of completedCustom) {
    acc[row.category] = (acc[row.category] ?? 0) + 1;
  }

  return acc;
}

export async function evaluateAfterDateCompleted(coupleId: string) {
  const completedRows = await loadCompletedDates(coupleId);
  const total = completedRows.length;
  if (total === 0) return;

  const sortedByDate = [...completedRows].sort(
    (a, b) => (a.completedAt?.getTime() ?? 0) - (b.completedAt?.getTime() ?? 0),
  );

  if (total >= 1 && sortedByDate[0]?.completedAt) {
    await unlockAchievement(coupleId, ACHIEVEMENT_IDS.primeraCita, sortedByDate[0].completedAt);
  }

  if (total >= 10 && sortedByDate[9]?.completedAt) {
    await unlockAchievement(coupleId, ACHIEVEMENT_IDS.diezCitas, sortedByDate[9].completedAt);
  }

  if (total >= 50 && sortedByDate[49]?.completedAt) {
    await unlockAchievement(coupleId, ACHIEVEMENT_IDS.mitad, sortedByDate[49].completedAt);
  }

  const catalogCompleted = await db
    .select()
    .from(coupleDates)
    .where(
      and(
        eq(coupleDates.coupleId, coupleId),
        eq(coupleDates.completed, true),
        eq(coupleDates.dateId, 100),
      ),
    )
    .limit(1);

  const date100 = catalogCompleted[0];
  if (date100?.completedAt) {
    await unlockAchievement(coupleId, ACHIEVEMENT_IDS.elFinal, date100.completedAt);
  }

  const countByCategory = await loadCategoryCounts(coupleId);

  if ((countByCategory['Gastronomía'] ?? 0) >= 5) {
    await unlockAchievement(coupleId, ACHIEVEMENT_IDS.foodies);
  }

  if ((countByCategory['Aventura'] ?? 0) >= 5) {
    await unlockAchievement(coupleId, ACHIEVEMENT_IDS.aventureros);
  }

  const hasAllCategories = ALL_DATE_CATEGORIES.every((c) => (countByCategory[c] ?? 0) >= 1);
  if (hasAllCategories) {
    await unlockAchievement(coupleId, ACHIEVEMENT_IDS.todasCategorias);
  }
}

export async function evaluateAfterPhotoAdded(coupleId: string) {
  const catalogWithPhotos = await db
    .select({ coupleDateId: dateImages.coupleDateId, cnt: count(dateImages.id) })
    .from(dateImages)
    .innerJoin(coupleDates, eq(dateImages.coupleDateId, coupleDates.id))
    .where(eq(coupleDates.coupleId, coupleId))
    .groupBy(dateImages.coupleDateId);

  let customWithPhotos: { customDateId: string; cnt: number }[] = [];
  try {
    customWithPhotos = await db
      .select({ customDateId: customDateImages.customDateId, cnt: count(customDateImages.id) })
      .from(customDateImages)
      .innerJoin(customDates, eq(customDateImages.customDateId, customDates.id))
      .where(eq(customDates.coupleId, coupleId))
      .groupBy(customDateImages.customDateId);
  } catch (e) {
    console.error('[achievements] custom_date_images query failed', e);
  }

  const datesWithPhotos =
    catalogWithPhotos.filter((r) => Number(r.cnt) > 0).length +
    customWithPhotos.filter((r) => Number(r.cnt) > 0).length;

  if (datesWithPhotos < 10) return;

  await unlockAchievement(coupleId, ACHIEVEMENT_IDS.conFotos);
}
