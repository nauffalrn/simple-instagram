import { Controller, Post, Body, Get, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('signup')
  async signup(@Body() createUserDto: CreateUserDto) {
    const result = await this.usersService.create(createUserDto);
    return {
      message: 'Pendaftaran berhasil, silakan cek email untuk verifikasi',
      user: result.user,
      verificationToken: result.verificationToken, 
    };
  }

  @Post('verify')
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    const user = await this.usersService.verifyEmail(verifyEmailDto);
    return {
      message: 'Email berhasil diverifikasi',
      user,
    };
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const result = await this.usersService.login(loginDto);
    return {
      message: 'Login berhasil',
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Patch('profile')
  async updateProfile(@Body('userId') userId: string, @Body() updateProfileDto: UpdateProfileDto) {
    const updatedUser = await this.usersService.updateProfile(userId, updateProfileDto);
    return {
      message: 'Profil berhasil diperbarui',
      user: updatedUser,
    };
  }

  @Patch('privacy')
  async togglePrivacy(@Body('userId') userId: string, @Body('isPrivate') isPrivate: boolean) {
    const updatedUser = await this.usersService.updateProfile(userId, { isPrivate });
    return {
      message: isPrivate 
        ? 'Profil berhasil diubah menjadi private' 
        : 'Profil berhasil diubah menjadi publik',
      user: updatedUser,
    };
  }

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    return {
      user,
    };
  }

  @Get('username/:username')
  async getUserByUsername(@Param('username') username: string) {
    const user = await this.usersService.findByUsername(username);
    return {
      user,
    };
  }
}