export const runtime = 'nodejs';
import { requireAuth, requireCouple } from '@/lib/auth-middleware';
import { evaluateAfterDateCompleted } from '@/lib/achievements/evaluate';
import { reconcileCoupleAchievements } from '@/lib/achievements/reconcile';
import {
  clearCatalogDateCompletion,
  clearCustomDateCompletion,
  COMPLETION_RESET_FIELDS,
} from '@/lib/clear-date-completion';

import { after } from 'next/server';
import { isCustomDateId, parseCatalogDateId } from '@/lib/date-id';
import { normalizeCatalogOverride, resolveCatalogDate } from '@/lib/resolve-catalog-date';
import { DATE_CATEGORIES, type DateCategory, type DateDifficulty } from '@/constants/dates';
import { db } from '@/db';
import { coupleDates, customDateImages, customDates, dateIdeas, dateImages } from '@/db/schema';
import { deleteFromStorage } from '@/lib/r2-delete';
import { eq, and, asc } from 'drizzle-orm';

const DIFFICULTIES: DateDifficulty[] = ['fácil', 'medio', 'difícil'];

function deferNewCompletionSideEffects(params: {
  coupleId: string;
  partnerId: string | null;
  userId: string;
  dateTitle: string;
  dateId: number;
}) {
  after(async () => {
    try {
      await evaluateAfterDateCompleted(params.coupleId);
    } catch (error) {
      console.error('[achievements] completion evaluation failed', error);
    }
  });
}

type CustomizationBody = {
  customTitle?: string | null;
  customDescription?: string | null;
  customCategory?: string | null;
  customDifficulty?: string | null;
};

type PatchBody = CustomizationBody & {
  completed?: boolean;
  completedAt?: string;
  locationName?: string;
  locationLat?: number;
  locationLng?: number;
  notes?: string;
  title?: string;
  description?: string;
  category?: string;
  difficulty?: string;
};

function validateCustomizationFields(body: CustomizationBody) {
  if (body.customCategory != null && body.customCategory !== '') {
    if (!DATE_CATEGORIES.includes(body.customCategory as DateCategory)) {
      return Response.json({ error: 'Categoría inválida' }, { status: 400 });
    }
  }

  if (body.customDifficulty != null && body.customDifficulty !== '') {
    if (!DIFFICULTIES.includes(body.customDifficulty as DateDifficulty)) {
      return Response.json({ error: 'Dificultad inválida' }, { status: 400 });
    }
  }

  if (body.customTitle != null && body.customTitle !== '' && !body.customTitle.trim()) {
    return Response.json({ error: 'El título no puede estar vacío' }, { status: 400 });
  }

  if (
    body.customDescription != null &&
    body.customDescription !== '' &&
    !body.customDescription.trim()
  ) {
    return Response.json({ error: 'La descripción no puede estar vacía' }, { status: 400 });
  }

  return null;
}

function buildCatalogCustomization(body: PatchBody, idea: typeof dateIdeas.$inferSelect) {
  const hasCustomizationFields =
    body.customTitle !== undefined ||
    body.customDescription !== undefined ||
    body.customCategory !== undefined ||
    body.customDifficulty !== undefined ||
    body.title !== undefined ||
    body.description !== undefined ||
    body.category !== undefined ||
    body.difficulty !== undefined;

  if (!hasCustomizationFields) {
    return {};
  }

  const rawTitle = body.customTitle !== undefined ? body.customTitle : body.title;
  const rawDescription =
    body.customDescription !== undefined ? body.customDescription : body.description;
  const rawCategory = body.customCategory !== undefined ? body.customCategory : body.category;
  const rawDifficulty =
    body.customDifficulty !== undefined ? body.customDifficulty : body.difficulty;

  return {
    customTitle: normalizeCatalogOverride(rawTitle, idea.title),
    customDescription: normalizeCatalogOverride(rawDescription, idea.description),
    customCategory: normalizeCatalogOverride(rawCategory, idea.category),
    customDifficulty: normalizeCatalogOverride(rawDifficulty, idea.difficulty),
  };
}

async function getCatalogDate(coupleId: string, id: string) {
  const dateId = parseCatalogDateId(id);
  if (dateId === null) {
    return null;
  }

  const ideaRows = await db.select().from(dateIdeas).where(eq(dateIdeas.id, dateId)).limit(1);
  const idea = ideaRows[0];
  if (!idea) {
    return null;
  }

  const cdRows = await db
    .select()
    .from(coupleDates)
    .where(and(eq(coupleDates.coupleId, coupleId), eq(coupleDates.dateId, dateId)))
    .limit(1);

  const cd = cdRows[0] ?? null;
  const resolved = resolveCatalogDate(idea, cd);

  let images: { id: string; url: string }[] = [];
  if (cd) {
    const imgRows = await db
      .select({ id: dateImages.id, url: dateImages.url })
      .from(dateImages)
      .where(eq(dateImages.coupleDateId, cd.id))
      .orderBy(asc(dateImages.uploadedAt));
    images = imgRows;
  }

  return {
    id: String(idea.id),
    isCustom: false,
    title: resolved.title,
    description: resolved.description,
    category: resolved.category,
    difficulty: resolved.difficulty,
    isCustomized: resolved.isCustomized,
    originalTitle: resolved.originalTitle,
    originalDescription: resolved.originalDescription,
    originalCategory: resolved.originalCategory,
    originalDifficulty: resolved.originalDifficulty,
    completed: cd?.completed ?? false,
    completedAt: cd?.completedAt ?? null,
    locationName: cd?.locationName ?? null,
    locationLat: cd?.locationLat ? parseFloat(cd.locationLat) : null,
    locationLng: cd?.locationLng ? parseFloat(cd.locationLng) : null,
    notes: cd?.notes ?? null,
    coupleDateId: cd?.id ?? null,
    images,
  };
}

async function getCustomDate(coupleId: string, id: string) {
  const rows = await db
    .select()
    .from(customDates)
    .where(and(eq(customDates.id, id), eq(customDates.coupleId, coupleId)))
    .limit(1);

  const custom = rows[0];
  if (!custom) {
    return null;
  }

  const imgRows = await db
    .select({ id: customDateImages.id, url: customDateImages.url })
    .from(customDateImages)
    .where(eq(customDateImages.customDateId, custom.id))
    .orderBy(asc(customDateImages.uploadedAt));

  return {
    id: custom.id,
    isCustom: true,
    title: custom.title,
    description: custom.description,
    category: custom.category,
    difficulty: custom.difficulty,
    isCustomized: false,
    completed: custom.completed,
    completedAt: custom.completedAt,
    locationName: custom.locationName,
    locationLat: custom.locationLat ? parseFloat(custom.locationLat) : null,
    locationLng: custom.locationLng ? parseFloat(custom.locationLng) : null,
    notes: custom.notes,
    coupleDateId: custom.id,
    images: imgRows,
  };
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const { userId } = await requireAuth(request);
    const { coupleId } = await requireCouple(userId);

    const date = isCustomDateId(id)
      ? await getCustomDate(coupleId, id)
      : await getCatalogDate(coupleId, id);

    if (!date) {
      return Response.json({ error: 'Cita no encontrada' }, { status: 404 });
    }

    return Response.json({ date });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
}

async function patchCatalogDate(
  coupleId: string,
  partnerId: string | null,
  userId: string,
  id: string,
  body: PatchBody,
) {
  const dateId = parseCatalogDateId(id);
  if (dateId === null) {
    return Response.json({ error: 'Cita no encontrada' }, { status: 404 });
  }

  const ideaRows = await db.select().from(dateIdeas).where(eq(dateIdeas.id, dateId)).limit(1);
  const idea = ideaRows[0];
  if (!idea) {
    return Response.json({ error: 'Cita no encontrada' }, { status: 404 });
  }

  const validationError = validateCustomizationFields(body);
  if (validationError) {
    return validationError;
  }

  const { completed, completedAt, locationName, locationLat, locationLng, notes } = body;
  const customization = buildCatalogCustomization(body, idea);
  const now = new Date();

  const existing = await db
    .select()
    .from(coupleDates)
    .where(and(eq(coupleDates.coupleId, coupleId), eq(coupleDates.dateId, dateId)))
    .limit(1);

  const wasCompleted = existing[0]?.completed ?? false;
  const isUncompleting = wasCompleted && completed === false;

  if (isUncompleting && existing[0]) {
    await clearCatalogDateCompletion(existing[0].id);
  }

  let result;

  if (existing.length === 0) {
    const [inserted] = await db
      .insert(coupleDates)
      .values({
        coupleId,
        dateId,
        completed: completed ?? false,
        completedAt: completedAt ? new Date(completedAt) : null,
        locationName: locationName ?? null,
        locationLat: locationLat != null ? String(locationLat) : null,
        locationLng: locationLng != null ? String(locationLng) : null,
        notes: notes ?? null,
        ...customization,
        updatedAt: now,
      })
      .returning();
    result = inserted;
  } else {
    const [updated] = await db
      .update(coupleDates)
      .set(
        isUncompleting
          ? {
              ...COMPLETION_RESET_FIELDS,
              ...(Object.keys(customization).length > 0 && customization),
              updatedAt: now,
            }
          : {
              ...(completed !== undefined && { completed }),
              ...(completedAt !== undefined && { completedAt: new Date(completedAt) }),
              ...(locationName !== undefined && { locationName }),
              ...(locationLat !== undefined && {
                locationLat: locationLat != null ? String(locationLat) : null,
              }),
              ...(locationLng !== undefined && {
                locationLng: locationLng != null ? String(locationLng) : null,
              }),
              ...(notes !== undefined && { notes }),
              ...(Object.keys(customization).length > 0 && customization),
              updatedAt: now,
            },
      )
      .where(eq(coupleDates.id, existing[0].id))
      .returning();
    result = updated;
  }

  const resolved = resolveCatalogDate(idea, result);
  const isNowCompleted = result.completed === true;

  if (!isNowCompleted && wasCompleted) {
    try {
      await reconcileCoupleAchievements(coupleId);
    } catch (e) {
      console.error('[achievements] reconcileCoupleAchievements failed', e);
    }
  }

  if (isNowCompleted && !wasCompleted) {
    deferNewCompletionSideEffects({
      coupleId,
      partnerId,
      userId,
      dateTitle: resolved.title,
      dateId,
    });
  }

  return Response.json({
    ...result,
    coupleDateId: result.id,
    id: String(idea.id),
    isCustom: false,
    title: resolved.title,
    description: resolved.description,
    category: resolved.category,
    difficulty: resolved.difficulty,
    isCustomized: resolved.isCustomized,
    originalTitle: resolved.originalTitle,
    originalDescription: resolved.originalDescription,
    originalCategory: resolved.originalCategory,
    originalDifficulty: resolved.originalDifficulty,
  });
}

async function patchCustomDate(
  coupleId: string,
  partnerId: string | null,
  userId: string,
  id: string,
  body: PatchBody,
) {
  const existing = await db
    .select()
    .from(customDates)
    .where(and(eq(customDates.id, id), eq(customDates.coupleId, coupleId)))
    .limit(1);

  const custom = existing[0];
  if (!custom) {
    return Response.json({ error: 'Cita no encontrada' }, { status: 404 });
  }

  const {
    completed,
    completedAt,
    locationName,
    locationLat,
    locationLng,
    notes,
    title,
    description,
    category,
    difficulty,
  } = body;

  if (title !== undefined && !title?.trim()) {
    return Response.json({ error: 'El título no puede estar vacío' }, { status: 400 });
  }

  if (description !== undefined && !description?.trim()) {
    return Response.json({ error: 'La descripción no puede estar vacía' }, { status: 400 });
  }

  if (category !== undefined && !DATE_CATEGORIES.includes(category as DateCategory)) {
    return Response.json({ error: 'Categoría inválida' }, { status: 400 });
  }

  if (difficulty !== undefined && !DIFFICULTIES.includes(difficulty as DateDifficulty)) {
    return Response.json({ error: 'Dificultad inválida' }, { status: 400 });
  }

  const wasCompleted = custom.completed;
  const isUncompleting = wasCompleted && completed === false;
  const now = new Date();

  if (isUncompleting) {
    await clearCustomDateCompletion(custom.id);
  }

  const [result] = await db
    .update(customDates)
    .set(
      isUncompleting
        ? {
            ...COMPLETION_RESET_FIELDS,
            updatedAt: now,
          }
        : {
            ...(completed !== undefined && { completed }),
            ...(completedAt !== undefined && { completedAt: new Date(completedAt) }),
            ...(locationName !== undefined && { locationName }),
            ...(locationLat !== undefined && {
              locationLat: locationLat != null ? String(locationLat) : null,
            }),
            ...(locationLng !== undefined && {
              locationLng: locationLng != null ? String(locationLng) : null,
            }),
            ...(notes !== undefined && { notes }),
            ...(title !== undefined && { title: title.trim() }),
            ...(description !== undefined && { description: description.trim() }),
            ...(category !== undefined && { category }),
            ...(difficulty !== undefined && { difficulty }),
            updatedAt: now,
          },
    )
    .where(eq(customDates.id, id))
    .returning();

  const isNowCompleted = result.completed === true;

  if (!isNowCompleted && wasCompleted) {
    try {
      await reconcileCoupleAchievements(coupleId);
    } catch (e) {
      console.error('[achievements] reconcileCoupleAchievements failed', e);
    }
  }

  if (isNowCompleted && !wasCompleted) {
    deferNewCompletionSideEffects({
      coupleId,
      partnerId,
      userId,
      dateTitle: result.title,
      dateId: 0,
    });
  }

  return Response.json({
    ...result,
    coupleDateId: result.id,
    id: result.id,
    isCustom: true,
    isCustomized: false,
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const { userId } = await requireAuth(request);
    const { coupleId, partnerId } = await requireCouple(userId);

    const body = await request.json();

    if (isCustomDateId(id)) {
      return patchCustomDate(coupleId, partnerId, userId, id, body);
    }

    return patchCatalogDate(coupleId, partnerId, userId, id, body);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    if (!isCustomDateId(id)) {
      return Response.json({ error: 'Solo se pueden eliminar citas propias' }, { status: 405 });
    }

    const { userId } = await requireAuth(request);
    const { coupleId } = await requireCouple(userId);

    const existing = await db
      .select()
      .from(customDates)
      .where(and(eq(customDates.id, id), eq(customDates.coupleId, coupleId)))
      .limit(1);

    if (!existing[0]) {
      return Response.json({ error: 'Cita no encontrada' }, { status: 404 });
    }

    const imgRows = await db
      .select({ url: customDateImages.url })
      .from(customDateImages)
      .where(eq(customDateImages.customDateId, id));

    for (const img of imgRows) {
      await deleteFromStorage(img.url);
    }

    await db.delete(customDateImages).where(eq(customDateImages.customDateId, id));
    await db
      .delete(customDates)
      .where(and(eq(customDates.id, id), eq(customDates.coupleId, coupleId)));

    return Response.json({ success: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
}
