import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UploadsModule } from '../uploads/uploads.module';
import { EmailService } from './email.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [ConfigModule, HttpModule, UploadsModule],
  controllers: [UsersController],
  providers: [UsersService, EmailService],
  exports: [UsersService, EmailService],
})
export class UsersModule {}
