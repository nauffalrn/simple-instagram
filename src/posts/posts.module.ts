import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { FollowsModule } from '../follows/follows.module';
import { UploadsModule } from '../uploads/uploads.module';
import { UsersModule } from '../users/users.module';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({
  imports: [
    UsersModule,
    FollowsModule,
    UploadsModule,
    MulterModule.register({
      storage: undefined, // Pakai memory storage (default)
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  ],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
