import type { DateCategory } from '@/constants/dates';

export const CARD_ASPECT = 1;

export const CARD_BACKGROUNDS = [
  '/images/cards/1.webp',
  '/images/cards/2.webp',
  '/images/cards/3.webp',
  '/images/cards/4.webp',
  '/images/cards/5.webp',
] as const;

export type CategoryCardTheme = {
  numberColor: string;
  pillBg: string;
  pillText: string;
};

export const CATEGORY_CARD_THEME: Record<DateCategory, CategoryCardTheme> = {
  Aventura: {
    numberColor: '#B8847A',
    pillBg: 'rgba(196, 132, 122, 0.55)',
    pillText: '#5C3D38',
  },
  Romántico: {
    numberColor: '#B07A82',
    pillBg: 'rgba(188, 122, 132, 0.55)',
    pillText: '#5C3840',
  },
  Gastronomía: {
    numberColor: '#C49A7A',
    pillBg: 'rgba(212, 168, 138, 0.55)',
    pillText: '#5C4838',
  },
  Cultura: {
    numberColor: '#6B8A72',
    pillBg: 'rgba(139, 168, 148, 0.55)',
    pillText: '#2E4536',
  },
  'En casa': {
    numberColor: '#A89078',
    pillBg: 'rgba(196, 180, 160, 0.55)',
    pillText: '#4A4038',
  },
  Naturaleza: {
    numberColor: '#8A9470',
    pillBg: 'rgba(168, 178, 138, 0.55)',
    pillText: '#3A4230',
  },
  Sorpresa: {
    numberColor: '#9A8878',
    pillBg: 'rgba(180, 168, 152, 0.55)',
    pillText: '#4A4438',
  },
};

export function getCardBackground(dateId: string) {
  const num = parseInt(dateId, 10);
  if (Number.isFinite(num)) {
    return CARD_BACKGROUNDS[(num - 1) % CARD_BACKGROUNDS.length];
  }
  let hash = 0;
  for (let i = 0; i < dateId.length; i++) {
    hash = (hash + dateId.charCodeAt(i)) % CARD_BACKGROUNDS.length;
  }
  return CARD_BACKGROUNDS[hash];
}

export function formatDateNumber(id: string) {
  const num = parseInt(id, 10);
  if (Number.isFinite(num)) {
    return String(num).padStart(2, '0');
  }
  return '✦';
}

export function getCardBackgroundForEntry(id: string, category: DateCategory, isCustom: boolean) {
  if (!isCustom) {
    return getCardBackground(id);
  }
  const categories: DateCategory[] = [
    'Aventura',
    'Romántico',
    'Gastronomía',
    'Cultura',
    'En casa',
    'Naturaleza',
    'Sorpresa',
  ];
  const idx = categories.indexOf(category);
  return CARD_BACKGROUNDS[idx >= 0 ? idx % CARD_BACKGROUNDS.length : 0];
}
