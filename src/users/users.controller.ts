import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../common/authGuard';
import { ErrorRegister } from '../helper/either';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('signup')
  async signup(@Body() createUserDto: CreateUserDto) {
    const result = await this.usersService.create(createUserDto);

    if (result.isLeft()) {
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

  @Post('verify')
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    const result = await this.usersService.verifyEmail(verifyEmailDto);

    if (result.isLeft()) {
      if (result.error instanceof ErrorRegister.InvalidVerificationToken) {
        throw new BadRequestException(result.error.message);
      }
      if (result.error instanceof ErrorRegister.UserNotFound) {
        throw new NotFoundException(result.error.message);
      }
      throw new BadRequestException('Terjadi kesalahan saat verifikasi email');
    }

    return {
      message: 'Email berhasil diverifikasi',
      user: result.value,
    };
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const result = await this.usersService.login(loginDto);

    if (result.isLeft()) {
      if (result.error instanceof ErrorRegister.UserNotFound) {
        throw new NotFoundException(result.error.message);
      }
      if (result.error instanceof ErrorRegister.EmailNotVerified) {
        throw new BadRequestException(result.error.message);
      }
      if (result.error instanceof ErrorRegister.InvalidPassword) {
        throw new BadRequestException(result.error.message);
      }
      throw new BadRequestException('Login gagal');
    }

    return {
      message: 'Login berhasil',
      user: result.value.user,
      accessToken: result.value.accessToken,
    };
  }

  @UseGuards(AuthGuard)
  @Patch('profile')
  async updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    const userId = req.user.sub;
    const result = await this.usersService.updateProfile(userId, updateProfileDto);

    if (result.isLeft()) {
      if (result.error instanceof ErrorRegister.UserNotFound) {
        throw new NotFoundException(result.error.message);
      }
      throw new BadRequestException('Gagal memperbarui profil');
    }

    return {
      message: 'Profil berhasil diperbarui',
      user: result.value,
    };
  }

  @UseGuards(AuthGuard)
  @Patch('privacy')
  async togglePrivacy(@Request() req, @Body() privacyData: { isPrivate: boolean }) {
    const userId = req.user.sub;
    const result = await this.usersService.updateProfile(userId, { isPrivate: privacyData.isPrivate });

    if (result.isLeft()) {
      if (result.error instanceof ErrorRegister.UserNotFound) {
        throw new NotFoundException(result.error.message);
      }
      throw new BadRequestException('Gagal mengubah status privasi');
    }

    return {
      message: privacyData.isPrivate
        ? 'Profil berhasil diubah menjadi private'
        : 'Profil berhasil diubah menjadi publik',
      user: result.value,
    };
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async getProfile(@Request() req) {
    const userId = req.user.sub;
    const result = await this.usersService.findById(userId);

    if (result.isLeft()) {
      throw new NotFoundException(result.error.message);
    }

    return {
      user: result.value,
    };
  }

  @Get(':id')
  async getUserById(@Request() req, @Param('id') id: string) {
    // Jika user terautentikasi, gunakan ID-nya, jika tidak, gunakan 'guest'
    const viewerId = req.user?.sub || 'guest';

    const canViewResult = await this.usersService.canViewUserProfile(viewerId, id);

    if (canViewResult.isLeft()) {
      throw new NotFoundException(canViewResult.error.message);
    }

    if (!canViewResult.value) {
      throw new ForbiddenException('Profil ini private. Anda perlu mengikuti pengguna untuk melihat detailnya.');
    }

    const result = await this.usersService.findById(id);

    if (result.isLeft()) {
      throw new NotFoundException(result.error.message);
    }

    return {
      user: result.value,
    };
  }

  @Get('username/:username')
  async getUserByUsername(@Request() req, @Param('username') username: string) {
    const result = await this.usersService.findByUsername(username);

    if (result.isLeft()) {
      throw new NotFoundException(result.error.message);
    }

    // Jika user terautentikasi, gunakan ID-nya, jika tidak, gunakan 'guest'
    const viewerId = req.user?.sub || 'guest';
    const canViewResult = await this.usersService.canViewUserProfile(viewerId, result.value.id);

    if (canViewResult.isLeft() || !canViewResult.value) {
      throw new ForbiddenException('Profil ini private. Anda perlu mengikuti pengguna untuk melihat detailnya.');
    }

    return {
      user: result.value,
    };
  }
}
