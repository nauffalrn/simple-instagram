import { runMigrations } from './index';

async function main() {
  try {
    console.log('Running migrations...');
    await runMigrations();
    console.log('✅ Migrations completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
