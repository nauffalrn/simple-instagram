import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../common/authGuard';
import { ErrorRegister } from '../helper/either';
import { FollowsService } from './follows.service';

@Controller('follows')
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  @UseGuards(AuthGuard)
  @Post()
  async followUser(@Request() req, @Body() followData: { followingId: string }) {
    const followerId = req.user.sub;
    const { followingId } = followData;

    const result = await this.followsService.followUser(followerId, followingId);

    if (result.isLeft()) {
      if (result.error instanceof ErrorRegister.CannotFollowSelf) {
        throw new BadRequestException(result.error.message);
      }
      if (result.error instanceof ErrorRegister.AlreadyFollowing) {
        throw new BadRequestException(result.error.message);
      }
      throw new BadRequestException('Gagal mengikuti pengguna');
    }

    return {
      message: 'Berhasil mengikuti pengguna',
      follow: result.value,
    };
  }

  @UseGuards(AuthGuard)
  @Delete(':followingId')
  async unfollowUser(@Request() req, @Param('followingId') followingId: string) {
    const followerId = req.user.sub;

    const result = await this.followsService.unfollowUser(followerId, followingId);

    if (result.isLeft()) {
      if (result.error instanceof ErrorRegister.NotFollowing) {
        throw new NotFoundException(result.error.message);
      }
      throw new BadRequestException('Gagal berhenti mengikuti pengguna');
    }

    return {
      message: 'Berhasil berhenti mengikuti pengguna',
    };
  }

  @UseGuards(AuthGuard)
  @Get('followers')
  async getFollowers(@Request() req) {
    const userId = req.user.sub;
    const result = await this.followsService.getFollowers(userId);
    if (result.isLeft()) {
      throw new BadRequestException('Gagal mengambil daftar pengikut');
    }
    return {
      followers: result.value,
    };
  }

  @UseGuards(AuthGuard)
  @Get('followings')
  async getFollowings(@Request() req) {
    const userId = req.user.sub;
    const result = await this.followsService.getFollowings(userId);
    if (result.isLeft()) {
      throw new BadRequestException('Gagal mengambil daftar yang diikuti');
    }
    return {
      followings: result.value,
    };
  }
}
