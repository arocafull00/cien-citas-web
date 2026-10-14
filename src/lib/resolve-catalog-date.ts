import type { DateCategory } from '@/constants/dates';

type DateIdea = {
  title: string;
  description: string;
  category: string;
  difficulty: string;
};

type CoupleDateOverrides =
  | {
      customTitle: string | null;
      customDescription: string | null;
      customCategory: string | null;
      customDifficulty: string | null;
    }
  | null
  | undefined;

export function resolveCatalogDate(idea: DateIdea, coupleDate?: CoupleDateOverrides) {
  const title = coupleDate?.customTitle ?? idea.title;
  const description = coupleDate?.customDescription ?? idea.description;
  const category = coupleDate?.customCategory ?? idea.category;
  const difficulty = coupleDate?.customDifficulty ?? idea.difficulty;

  const isCustomized =
    coupleDate?.customTitle != null ||
    coupleDate?.customDescription != null ||
    coupleDate?.customCategory != null ||
    coupleDate?.customDifficulty != null;

  return {
    title,
    description,
    category: category as DateCategory,
    difficulty,
    isCustomized,
    originalTitle: idea.title,
    originalDescription: idea.description,
    originalCategory: idea.category as DateCategory,
    originalDifficulty: idea.difficulty,
  };
}

export function normalizeCatalogOverride(
  value: string | null | undefined,
  catalogValue: string,
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === catalogValue) {
    return null;
  }

  return trimmed;
}
