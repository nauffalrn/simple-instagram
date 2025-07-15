import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ServeStaticModule } from '@nestjs/serve-static';
import * as fs from 'fs';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbModule } from './db/db.module'; // Import DbModule
import { FollowsModule } from './follows/follows.module';
import { PostsModule } from './posts/posts.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    UsersModule,
    PostsModule,
    FollowsModule,
    DbModule, // Tambahkan DbModule di sini
    JwtModule.register({
      global: true,
      privateKey: fs.readFileSync('private.key'),
      publicKey: fs.readFileSync('public.key'),
      signOptions: {
        algorithm: 'RS256',
        expiresIn: '24h',
      },
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), '/uploads/'),
      serveRoot: '/uploads',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
