import {
  boolean,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
  integer,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkUserId: text('clerk_user_id').unique().notNull(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  pushToken: text('push_token'),
  notifyPartnerActivity: boolean('notify_partner_activity').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const couples = pgTable('couples', {
  id: uuid('id').primaryKey().defaultRandom(),
  user1Id: uuid('user1_id')
    .notNull()
    .references(() => users.id),
  user2Id: uuid('user2_id').references(() => users.id),
  inviteCode: varchar('invite_code', { length: 6 }).unique().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const inviteCodes = pgTable('invite_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id),
  code: varchar('code', { length: 6 }).unique().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const dateIdeas = pgTable('date_ideas', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(),
  difficulty: text('difficulty').notNull(),
});

export const coupleDates = pgTable(
  'couple_dates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    coupleId: uuid('couple_id')
      .notNull()
      .references(() => couples.id),
    dateId: integer('date_id')
      .notNull()
      .references(() => dateIdeas.id),
    completed: boolean('completed').default(false).notNull(),
    completedAt: timestamp('completed_at'),
    locationName: text('location_name'),
    locationLat: numeric('location_lat', { precision: 10, scale: 7 }),
    locationLng: numeric('location_lng', { precision: 10, scale: 7 }),
    notes: text('notes'),
    customTitle: text('custom_title'),
    customDescription: text('custom_description'),
    customCategory: text('custom_category'),
    customDifficulty: text('custom_difficulty'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [unique('couple_date_unique').on(table.coupleId, table.dateId)],
);

export const dateImages = pgTable('date_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  coupleDateId: uuid('couple_date_id')
    .notNull()
    .references(() => coupleDates.id),
  url: text('url').notNull(),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
});

export const customDates = pgTable('custom_dates', {
  id: uuid('id').primaryKey().defaultRandom(),
  coupleId: uuid('couple_id')
    .notNull()
    .references(() => couples.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(),
  difficulty: text('difficulty').notNull(),
  completed: boolean('completed').default(false).notNull(),
  completedAt: timestamp('completed_at'),
  locationName: text('location_name'),
  locationLat: numeric('location_lat', { precision: 10, scale: 7 }),
  locationLng: numeric('location_lng', { precision: 10, scale: 7 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const customDateImages = pgTable('custom_date_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  customDateId: uuid('custom_date_id')
    .notNull()
    .references(() => customDates.id),
  url: text('url').notNull(),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
});

export const achievements = pgTable('achievements', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  iconSet: text('icon_set').notNull(),
  iconName: text('icon_name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const coupleAchievements = pgTable(
  'couple_achievements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    coupleId: uuid('couple_id')
      .notNull()
      .references(() => couples.id),
    achievementId: text('achievement_id')
      .notNull()
      .references(() => achievements.id),
    unlockedAt: timestamp('unlocked_at').defaultNow().notNull(),
  },
  (table) => [unique('couple_achievement_unique').on(table.coupleId, table.achievementId)],
);

export const usersRelations = relations(users, ({ many, one }) => ({
  coupleDates: many(coupleDates),
  pendingInvite: one(inviteCodes, {
    fields: [users.id],
    references: [inviteCodes.userId],
  }),
}));

export const couplesRelations = relations(couples, ({ one, many }) => ({
  user1: one(users, { fields: [couples.user1Id], references: [users.id] }),
  user2: one(users, { fields: [couples.user2Id], references: [users.id] }),
  coupleDates: many(coupleDates),
  customDates: many(customDates),
  coupleAchievements: many(coupleAchievements),
}));

export const inviteCodesRelations = relations(inviteCodes, ({ one }) => ({
  user: one(users, { fields: [inviteCodes.userId], references: [users.id] }),
}));

export const dateIdeasRelations = relations(dateIdeas, ({ many }) => ({
  coupleDates: many(coupleDates),
}));

export const coupleDatesRelations = relations(coupleDates, ({ one, many }) => ({
  couple: one(couples, { fields: [coupleDates.coupleId], references: [couples.id] }),
  dateIdea: one(dateIdeas, { fields: [coupleDates.dateId], references: [dateIdeas.id] }),
  images: many(dateImages),
}));

export const dateImagesRelations = relations(dateImages, ({ one }) => ({
  coupleDate: one(coupleDates, {
    fields: [dateImages.coupleDateId],
    references: [coupleDates.id],
  }),
}));

export const customDatesRelations = relations(customDates, ({ one, many }) => ({
  couple: one(couples, { fields: [customDates.coupleId], references: [couples.id] }),
  images: many(customDateImages),
}));

export const customDateImagesRelations = relations(customDateImages, ({ one }) => ({
  customDate: one(customDates, {
    fields: [customDateImages.customDateId],
    references: [customDates.id],
  }),
}));

export const achievementsRelations = relations(achievements, ({ many }) => ({
  coupleAchievements: many(coupleAchievements),
}));

export const coupleAchievementsRelations = relations(coupleAchievements, ({ one }) => ({
  couple: one(couples, {
    fields: [coupleAchievements.coupleId],
    references: [couples.id],
  }),
  achievement: one(achievements, {
    fields: [coupleAchievements.achievementId],
    references: [achievements.id],
  }),
}));
