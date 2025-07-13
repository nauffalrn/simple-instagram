import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Param,
  UsePipes,
  BadRequestException,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { LoginDto } from './dto/login.dto';
import {
  createUserSchema,
  loginSchema,
  verifyEmailSchema,
  updateProfileSchema,
  togglePrivacySchema,
} from './schemas/user.schema';
import { ErrorRegister } from '../helper/either';
import { AuthGuard } from 'src/common/authGuard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  @UseGuards(AuthGuard)
  @Post('signup')
  async signup(@Body() createUserDto: CreateUserDto) {
    const result = await this.usersService.create(createUserDto);
    console.log('Result:', result);

    if (result.isLeft()) {
      console.log(result.error instanceof ErrorRegister.InputanSalah);
      if (result.error instanceof ErrorRegister.InputanSalah) {
        throw new BadRequestException(result.error.message);
      }
      if (result.error instanceof ErrorRegister.EmailAlreadyRegistered) {
        throw new BadRequestException(result.error.message);
      }
      throw new BadRequestException('Terjadi kesalahan saat pendaftaran');
    }


    return {
      message: 'Pendaftaran berhasil, silakan cek email untuk verifikasi',
      user: result.value.user,
      verificationToken: result.value.verificationToken,
    };
  }

  // @Post('verify')
  // @UsePipes(new ZodValidationPipe(verifyEmailSchema))
  // async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
  //   const result = await this.usersService.verifyEmail(verifyEmailDto);

  //   if (result.isLeft()) {
  //     if (result.error instanceof ErrorRegister.InvalidVerificationToken) {
  //       throw new BadRequestException(result.error.message);
  //     }
  //     if (result.error instanceof ErrorRegister.UserNotFound) {
  //       throw new NotFoundException(result.error.message);
  //     }
  //     throw new BadRequestException('Terjadi kesalahan saat verifikasi email');
  //   }

  //   return {
  //     message: 'Email berhasil diverifikasi',
  //     user: result.value,
  //   };
  // }

  // @Post('login')
  // @UsePipes(new ZodValidationPipe(loginSchema))
  // async login(@Body() loginDto: LoginDto) {
  //   const result = await this.usersService.login(loginDto);

  //   if (result.isLeft()) {
  //     if (result.error instanceof ErrorRegister.UserNotFound) {
  //       throw new NotFoundException(result.error.message);
  //     }
  //     if (result.error instanceof ErrorRegister.EmailNotVerified) {
  //       throw new BadRequestException(result.error.message);
  //     }
  //     if (result.error instanceof ErrorRegister.InvalidPassword) {
  //       throw new BadRequestException(result.error.message);
  //     }
  //     throw new BadRequestException('Login gagal');
  //   }

  //   return {
  //     message: 'Login berhasil',
  //     user: result.value.user,
  //     accessToken: result.value.accessToken,
  //   };
  // }

  // @Patch('profile')
  // @UsePipes(new ZodValidationPipe(updateProfileSchema))
  // async updateProfile(@Body() updateProfileData: any) {
  //   const { userId, ...updateProfileDto } = updateProfileData;
  //   const result = await this.usersService.updateProfile(
  //     userId,
  //     updateProfileDto,
  //   );

  //   if (result.isLeft()) {
  //     if (result.error instanceof ErrorRegister.UserNotFound) {
  //       throw new NotFoundException(result.error.message);
  //     }
  //     throw new BadRequestException('Gagal memperbarui profil');
  //   }

  //   return {
  //     message: 'Profil berhasil diperbarui',
  //     user: result.value,
  //   };
  // }

  // @Patch('privacy')
  // @UsePipes(new ZodValidationPipe(togglePrivacySchema))
  // async togglePrivacy(@Body() privacyData: any) {
  //   const { userId, isPrivate } = privacyData;
  //   const result = await this.usersService.updateProfile(userId, { isPrivate });

  //   if (result.isLeft()) {
  //     if (result.error instanceof ErrorRegister.UserNotFound) {
  //       throw new NotFoundException(result.error.message);
  //     }
  //     throw new BadRequestException('Gagal mengubah status privasi');
  //   }

  //   return {
  //     message: isPrivate
  //       ? 'Profil berhasil diubah menjadi private'
  //       : 'Profil berhasil diubah menjadi publik',
  //     user: result.value,
  //   };
  // }

  // @Get(':id')
  // async getUserById(@Param('id') id: string) {
  //   const result = await this.usersService.findById(id);

  //   if (result.isLeft()) {
  //     throw new NotFoundException(result.error.message);
  //   }

  //   return {
  //     user: result.value,
  //   };
  // }

  // @Get('username/:username')
  // async getUserByUsername(@Param('username') username: string) {
  //   const result = await this.usersService.findByUsername(username);

  //   if (result.isLeft()) {
  //     throw new NotFoundException(result.error.message);
  //   }

  //   return {
  //     user: result.value,
  //   };
  // }
}
