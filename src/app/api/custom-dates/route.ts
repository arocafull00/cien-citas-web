export const runtime = 'nodejs';
import { requireAuth, requireCouple } from '@/lib/auth-middleware';
import { DATE_CATEGORIES, type DateCategory, type DateDifficulty } from '@/constants/dates';
import { db } from '@/db';
import { customDates } from '@/db/schema';

const DIFFICULTIES: DateDifficulty[] = ['fácil', 'medio', 'difícil'];

export async function POST(request: Request) {
  try {
    const { userId } = await requireAuth(request);
    const { coupleId } = await requireCouple(userId);

    const body = await request.json();
    const { title, description, category, difficulty } = body as {
      title?: string;
      description?: string;
      category?: string;
      difficulty?: string;
    };

    if (!title?.trim() || !description?.trim() || !category || !difficulty) {
      return Response.json(
        { error: 'Campos requeridos: title, description, category, difficulty' },
        { status: 400 },
      );
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
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
}
