import type { DateCategory } from '@/constants/dates';

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
export type Account = { id: string; clerkUserId: string; name: string; avatarUrl: string | null };
export type Couple = {
  id: string;
  inviteCode: string;
  createdAt: string;
  partner: { name: string; avatarUrl: string | null } | null;
};
export type Profile = {
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
    createdAt: string;
    notifyPartnerActivity: boolean;
  };
  couple: {
    id: string;
    joinedAt: string;
    partnerName: string | null;
    partnerAvatarUrl?: string | null;
  };
  stats: { totalCompleted: number; categoriesCompleted: number; daysActive: number };
};
export type Achievement = {
  id: string;
  title: string;
  description: string;
  iconName: string;
  iconSet?: string;
  unlocked: boolean;
  unlockedAt: string | null;
};
export type Snapshot = {
  account: Account;
  couple: Couple;
  dates: DateEntry[];
  details: Record<string, DateDetail>;
  profile: Profile | null;
  achievements: Achievement[];
  updatedAt: string;
};
