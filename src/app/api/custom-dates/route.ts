export const runtime = 'nodejs';
import { requireAuth, requireCouple } from '@/lib/auth-middleware';
import { DATE_CATEGORIES, type DateCategory, type DateDifficulty } from '@/constants/dates';
import { handleApiError } from '@/lib/db-errors';
import { DIFFICULTIES, TEXT_LIMITS } from '@/lib/date-validation';
import { readJsonObject } from '@/lib/request-body';
import { db } from '@/db';
import { customDates } from '@/db/schema';

export async function POST(request: Request) {
  try {
    const { userId } = await requireAuth(request);
    const { coupleId } = await requireCouple(userId);

    const { title, description, category, difficulty } = await readJsonObject(request);

    if (
      typeof title !== 'string' ||
      typeof description !== 'string' ||
      typeof category !== 'string' ||
      typeof difficulty !== 'string' ||
      !title.trim() ||
      !description.trim()
    ) {
      return Response.json(
        { error: 'Campos requeridos: title, description, category, difficulty' },
        { status: 400 },
      );
    }

    if (
      title.trim().length > TEXT_LIMITS.title ||
      description.trim().length > TEXT_LIMITS.description
    ) {
      return Response.json({ error: 'El texto es demasiado largo' }, { status: 400 });
    }

    if (!DATE_CATEGORIES.includes(category as DateCategory)) {
      return Response.json({ error: 'Categoría inválida' }, { status: 400 });
    }

    if (!DIFFICULTIES.includes(difficulty as DateDifficulty)) {
      return Response.json({ error: 'Dificultad inválida' }, { status: 400 });
    }

    const now = new Date();
    const [created] = await db
      .insert(customDates)
      .values({
        coupleId,
        title: title.trim(),
        description: description.trim(),
        category,
        difficulty,
        updatedAt: now,
      })
      .returning();

    return Response.json(
      {
        date: {
          id: created.id,
          isCustom: true,
          title: created.title,
          description: created.description,
          category: created.category as DateCategory,
          difficulty: created.difficulty,
          isCustomized: false,
          completed: created.completed,
          completedAt: created.completedAt,
          locationName: created.locationName,
          notes: created.notes,
          imageCount: 0,
          coverImageUrl: null,
          coupleDateId: created.id,
        },
      },
      { status: 201 },
    );
  } catch (e) {
    return handleApiError(e);
  }
}
