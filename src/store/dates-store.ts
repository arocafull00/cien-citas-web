

import type { DateCategory } from '@/constants/dates';

export type DateFilter = {
  category: DateCategory | null;
  completed: boolean | null;
};

export type DateEntry = {
  id: string;
  isCustom: boolean;
  title: string;
  description: string;
  category: DateCategory;
  difficulty: string;
  isCustomized: boolean;
  completed: boolean;
  completedAt: string | null;
  locationName: string | null;
  notes: string | null;
  imageCount: number;
  coverImageUrl: string | null;
  coupleDateId: string | null;
};

export type DateDetail = {
  id: string;
  isCustom: boolean;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  isCustomized: boolean;
  originalTitle?: string;
  originalDescription?: string;
  originalCategory?: string;
  originalDifficulty?: string;
  completed: boolean;
  completedAt: string | null;
  locationName: string | null;
  locationLat: number | null;
  locationLng: number | null;
  notes: string | null;
  coupleDateId: string | null;
  images: { id: string; url: string }[];
};

