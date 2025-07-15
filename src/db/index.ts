import * as dotenv from 'dotenv';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { follows, posts, users, verificationTokens } from './schema';
import * as postgres from 'postgres';

// Load environment variables
dotenv.config();

// Connection string
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL tidak ditemukan di .env file');
  process.exit(1);
}

// Client untuk migrations
const migrationClient = postgres(connectionString, { max: 1 });

// PostgreSQL client
export const client = postgres(connectionString);

// Create drizzle instance
export const db = drizzle(client, {
  schema: { users, posts, follows, verificationTokens },
});

// Migration function
export async function runMigrations() {
  try {
    await migrate(drizzle(migrationClient), {
      migrationsFolder: 'drizzle/migrations',
    });
    console.log('✅ Migrations completed');
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  } finally {
    await migrationClient.end();
  }
}

// Type untuk digunakan di service
export type DrizzleInstance = PostgresJsDatabase<{
  users: typeof users;
  posts: typeof posts;
  follows: typeof follows;
  verificationTokens: typeof verificationTokens;
}>;
