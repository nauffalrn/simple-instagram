import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { PostsModule } from './posts/posts.module';
import { FollowsModule } from './follows/follows.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [UsersModule, PostsModule, FollowsModule, JwtModule.register({global: true, secret: "123123"
  })],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
