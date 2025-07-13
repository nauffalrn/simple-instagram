import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { UsersModule } from '../users/users.module';
import { Follow } from 'src/follows/entities/follow.entity';
import { FollowsModule } from 'src/follows/follows.module';

@Module({
  imports: [UsersModule, FollowsModule],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}