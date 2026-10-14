import type { DateEntry, DateDetail } from '@/store/dates-store';
export type { DateEntry, DateDetail };
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
