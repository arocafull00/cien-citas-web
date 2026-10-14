export const runtime = 'nodejs';
import { requireAuth, requireCouple } from '@/lib/auth-middleware';
import { resolveCatalogDate } from '@/lib/resolve-catalog-date';
import { db } from '@/db';
import { coupleDates, customDateImages, customDates, dateIdeas, dateImages } from '@/db/schema';
import type { DateCategory } from '@/constants/dates';
import { eq, count, asc, desc } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { userId } = await requireAuth(request);
    const { coupleId } = await requireCouple(userId);

    const url = new URL(request.url);
    const categoryFilter = url.searchParams.get('category') as DateCategory | null;
    const completedFilter = url.searchParams.get('completed');

    const [ideas, rows, imageRows, customRows, customImageRows] = await Promise.all([
      db.select().from(dateIdeas).orderBy(asc(dateIdeas.id)),
      db
        .select({
          coupleDate: coupleDates,
          imageCount: count(dateImages.id),
        })
        .from(coupleDates)
        .leftJoin(dateImages, eq(dateImages.coupleDateId, coupleDates.id))
        .where(eq(coupleDates.coupleId, coupleId))
        .groupBy(coupleDates.id),
      db
        .selectDistinctOn([coupleDates.dateId], { dateId: coupleDates.dateId, url: dateImages.url })
        .from(dateImages)
        .innerJoin(coupleDates, eq(dateImages.coupleDateId, coupleDates.id))
        .where(eq(coupleDates.coupleId, coupleId))
        .orderBy(coupleDates.dateId, asc(dateImages.uploadedAt)),
      db
        .select({ customDate: customDates, imageCount: count(customDateImages.id) })
        .from(customDates)
        .leftJoin(customDateImages, eq(customDateImages.customDateId, customDates.id))
        .where(eq(customDates.coupleId, coupleId))
        .groupBy(customDates.id)
        .orderBy(desc(customDates.createdAt)),
      db
        .selectDistinctOn([customDateImages.customDateId], {
          customDateId: customDateImages.customDateId,
          url: customDateImages.url,
        })
        .from(customDateImages)
        .innerJoin(customDates, eq(customDateImages.customDateId, customDates.id))
        .where(eq(customDates.coupleId, coupleId))
        .orderBy(customDateImages.customDateId, asc(customDateImages.uploadedAt)),
    ]);

    const coupleDateMap = new Map(
      rows.map((r) => [r.coupleDate.dateId, { ...r.coupleDate, imageCount: Number(r.imageCount) }]),
    );

    const coverImageByDateId = new Map<number, string>();
    for (const row of imageRows) {
      if (!coverImageByDateId.has(row.dateId)) {
        coverImageByDateId.set(row.dateId, row.url);
      }
    }

    const catalogDates = ideas.map((idea) => {
      const cd = coupleDateMap.get(idea.id);
      const resolved = resolveCatalogDate(idea, cd ?? null);
      return {
        id: String(idea.id),
        isCustom: false,
        title: resolved.title,
        description: resolved.description,
        category: resolved.category,
        difficulty: resolved.difficulty,
        isCustomized: resolved.isCustomized,
        completed: cd?.completed ?? false,
        completedAt: cd?.completedAt ?? null,
        locationName: cd?.locationName ?? null,
        notes: cd?.notes ?? null,
        imageCount: cd?.imageCount ?? 0,
        coverImageUrl: coverImageByDateId.get(idea.id) ?? null,
        coupleDateId: cd?.id ?? null,
      };
    });

    const coverImageByCustomId = new Map<string, string>();
    for (const row of customImageRows) {
      if (!coverImageByCustomId.has(row.customDateId)) {
        coverImageByCustomId.set(row.customDateId, row.url);
      }
    }

    const customDatesList = customRows.map((r) => ({
      id: r.customDate.id,
      isCustom: true,
      title: r.customDate.title,
      description: r.customDate.description,
      category: r.customDate.category as DateCategory,
      difficulty: r.customDate.difficulty,
      isCustomized: false,
      completed: r.customDate.completed,
      completedAt: r.customDate.completedAt,
      locationName: r.customDate.locationName,
      notes: r.customDate.notes,
      imageCount: Number(r.imageCount),
      coverImageUrl: coverImageByCustomId.get(r.customDate.id) ?? null,
      coupleDateId: r.customDate.id,
    }));

    let dates = [...customDatesList, ...catalogDates];

    if (categoryFilter) {
      dates = dates.filter((d) => d.category === categoryFilter);
    }

    if (completedFilter === 'true') {
      dates = dates.filter((d) => d.completed);
    } else if (completedFilter === 'false') {
      dates = dates.filter((d) => !d.completed);
    }

    return Response.json({ dates });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
}
