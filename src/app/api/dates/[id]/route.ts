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
import { handleApiError } from '@/lib/db-errors';
import { DIFFICULTIES, parseDatePatch, type DatePatch } from '@/lib/date-validation';
import { deleteImagesLater } from '@/lib/r2';
import { readJsonObject } from '@/lib/request-body';
import { eq, and, asc } from 'drizzle-orm';

type PatchBody = DatePatch;

function deferCompletionAchievements(coupleId: string) {
  after(async () => {
    try {
      await evaluateAfterDateCompleted(coupleId);
    } catch (error) {
      console.error('[achievements] completion evaluation failed', error);
    }
  });
}

function validateCustomizationFields(body: PatchBody) {
  const category = body.customCategory !== undefined ? body.customCategory : body.category;
  const difficulty = body.customDifficulty !== undefined ? body.customDifficulty : body.difficulty;
  const title = body.customTitle !== undefined ? body.customTitle : body.title;
  const description =
    body.customDescription !== undefined ? body.customDescription : body.description;

  if (category != null && category !== '') {
    if (!DATE_CATEGORIES.includes(category as DateCategory)) {
      return Response.json({ error: 'Categoría inválida' }, { status: 400 });
    }
  }

  if (difficulty != null && difficulty !== '') {
    if (!DIFFICULTIES.includes(difficulty as DateDifficulty)) {
      return Response.json({ error: 'Dificultad inválida' }, { status: 400 });
    }
  }

  if (title != null && title !== '' && !title.trim()) {
    return Response.json({ error: 'El título no puede estar vacío' }, { status: 400 });
  }

  if (description != null && description !== '' && !description.trim()) {
    return Response.json({ error: 'La descripción no puede estar vacía' }, { status: 400 });
  }

  return null;
}

function completionFields(body: PatchBody) {
  const { completed, completedAt, locationName, locationLat, locationLng, notes } = body;
  return {
    ...(completed !== undefined && { completed }),
    ...(completedAt !== undefined && { completedAt: completedAt ? new Date(completedAt) : null }),
    ...(locationName !== undefined && { locationName }),
    ...(locationLat !== undefined && {
      locationLat: locationLat != null ? String(locationLat) : null,
    }),
    ...(locationLng !== undefined && {
      locationLng: locationLng != null ? String(locationLng) : null,
    }),
    ...(notes !== undefined && { notes }),
  };
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
    return handleApiError(e);
  }
}

async function patchCatalogDate(coupleId: string, id: string, body: PatchBody) {
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

  const customization = buildCatalogCustomization(body, idea);
  const now = new Date();
  const findExisting = async () =>
    (
      await db
        .select()
        .from(coupleDates)
        .where(and(eq(coupleDates.coupleId, coupleId), eq(coupleDates.dateId, dateId)))
        .limit(1)
    )[0];

  let existing = await findExisting();
  let wasCompleted = existing?.completed ?? false;
  let result: typeof coupleDates.$inferSelect | undefined;

  if (!existing) {
    const { completed, completedAt, locationName, locationLat, locationLng, notes } = body;
    [result] = await db
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
      .onConflictDoNothing({ target: [coupleDates.coupleId, coupleDates.dateId] })
      .returning();
    if (!result) {
      existing = await findExisting();
      wasCompleted = existing?.completed ?? false;
    }
  }

  if (!result) {
    if (!existing) throw new Error('couple_dates row missing after conflicting insert');
    const isUncompleting = wasCompleted && body.completed === false;
    if (isUncompleting) {
      deleteImagesLater(await clearCatalogDateCompletion(existing.id));
    }
    [result] = await db
      .update(coupleDates)
      .set({
        ...(isUncompleting ? COMPLETION_RESET_FIELDS : completionFields(body)),
        ...customization,
        updatedAt: now,
      })
      .where(eq(coupleDates.id, existing.id))
      .returning();
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
    deferCompletionAchievements(coupleId);
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

async function patchCustomDate(coupleId: string, id: string, body: PatchBody) {
  const existing = await db
    .select()
    .from(customDates)
    .where(and(eq(customDates.id, id), eq(customDates.coupleId, coupleId)))
    .limit(1);

  const custom = existing[0];
  if (!custom) {
    return Response.json({ error: 'Cita no encontrada' }, { status: 404 });
  }

  const { title, description, category, difficulty } = body;

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
  const isUncompleting = wasCompleted && body.completed === false;
  const now = new Date();

  if (isUncompleting) {
    deleteImagesLater(await clearCustomDateCompletion(custom.id));
  }

  const [result] = await db
    .update(customDates)
    .set(
      isUncompleting
        ? { ...COMPLETION_RESET_FIELDS, updatedAt: now }
        : {
            ...completionFields(body),
            ...(title && { title: title.trim() }),
            ...(description && { description: description.trim() }),
            ...(category && { category }),
            ...(difficulty && { difficulty }),
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
    deferCompletionAchievements(coupleId);
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
    const { coupleId } = await requireCouple(userId);

    const parsed = parseDatePatch(await readJsonObject(request));
    if (parsed.error !== undefined) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }

    if (isCustomDateId(id)) {
      return await patchCustomDate(coupleId, id, parsed.value);
    }

    return await patchCatalogDate(coupleId, id, parsed.value);
  } catch (e) {
    return handleApiError(e);
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
      .select({ id: customDates.id })
      .from(customDates)
      .where(and(eq(customDates.id, id), eq(customDates.coupleId, coupleId)))
      .limit(1);

    if (!existing[0]) {
      return Response.json({ error: 'Cita no encontrada' }, { status: 404 });
    }

    const images = await db
      .delete(customDateImages)
      .where(eq(customDateImages.customDateId, id))
      .returning({ url: customDateImages.url });
    await db
      .delete(customDates)
      .where(and(eq(customDates.id, id), eq(customDates.coupleId, coupleId)));
    deleteImagesLater(images.map((image) => image.url));

    return Response.json({ success: true });
  } catch (e) {
    return handleApiError(e);
  }
}
