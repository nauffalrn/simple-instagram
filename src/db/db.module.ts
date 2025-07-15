import { Global, Module } from '@nestjs/common';
import { db, runMigrations } from './index';

@Global()
@Module({
  providers: [
    {
      provide: 'DB',
      useFactory: async () => {
        // Run migrations in development
        if (process.env.NODE_ENV !== 'production') {
          try {
            await runMigrations();
            console.log('✅ Migrations completed');
          } catch (error) {
            console.error('❌ Migration failed:', error);
          }
        }
        return db;
      },
    },
  ],
  exports: ['DB'],
})
export class DbModule {}
