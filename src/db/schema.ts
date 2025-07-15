import { relations } from 'drizzle-orm';
import { boolean, pgTable, text, timestamp, uuid, varchar, unique } from 'drizzle-orm/pg-core';

// User schema
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  fullName: varchar('full_name', { length: 255 }),
  bio: text('bio'),
  username: varchar('username', { length: 50 }).unique(),
  pictureUrl: varchar('picture_url', { length: 255 }),
  isEmailVerified: boolean('is_email_verified').default(false).notNull(),
  isPrivate: boolean('is_private').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Post schema
export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  pictureUrl: varchar('picture_url', { length: 255 }).notNull(),
  caption: text('caption'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  isDeleted: boolean('is_deleted').default(false).notNull(),
});

// Follow schema
export const follows = pgTable(
  'follows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    followerId: uuid('follower_id')
      .notNull()
      .references(() => users.id),
    followingId: uuid('following_id')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    uniqueFollowerFollowing: unique().on(table.followerId, table.followingId),
  })
);

// Verification tokens table
export const verificationTokens = pgTable('verification_tokens', {
  email: varchar('email', { length: 255 }).primaryKey(),
  token: varchar('token', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
});

// Definisi relasi untuk users
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  followedBy: many(follows, { relationName: 'followedBy' }),
  following: many(follows, { relationName: 'following' }),
}));

// Definisi relasi untuk posts
export const postsRelations = relations(posts, ({ one }) => ({
  user: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
}));

// Definisi relasi untuk follows
export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    fields: [follows.followerId],
    references: [users.id],
    relationName: 'following',
  }),
  following: one(users, {
    fields: [follows.followingId],
    references: [users.id],
    relationName: 'followedBy',
  }),
}));
