import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { EmailService } from './email.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, EmailService],
  exports: [UsersService, EmailService],
})
export class UsersModule {}