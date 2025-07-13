import {
  Controller,
  Post,
  Delete,
  Body,
  Get,
  Param,
  UsePipes,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FollowsService } from './follows.service';
import { followUserSchema, unfollowUserSchema } from './schemas/follow.schema';
import { ErrorRegister } from '../helper/either';

@Controller('follows')
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  @Post()
  async followUser(@Body() followData: any) {
    const { followerId, followingId } = followData;
    const result = await this.followsService.followUser(
      followerId,
      followingId,
    );

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

  @Delete()
  async unfollowUser(@Body() unfollowData: any) {
    const { followerId, followingId } = unfollowData;
    const result = await this.followsService.unfollowUser(
      followerId,
      followingId,
    );

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

  @Post('unfollow')
  async unfollowUserAlt(@Body() unfollowData: any) {
    const { followerId, followingId } = unfollowData;
    const result = await this.followsService.unfollowUser(
      followerId,
      followingId,
    );

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

  @Get('followers/:userId')
  async getFollowers(@Param('userId') userId: string) {
    const result = await this.followsService.getFollowers(userId);

    if (result.isLeft()) {
      throw new BadRequestException('Gagal mengambil daftar pengikut');
    }

    return {
      followers: result.value,
    };
  }

  @Get('followings/:userId')
  async getFollowings(@Param('userId') userId: string) {
    const result = await this.followsService.getFollowings(userId);

    if (result.isLeft()) {
      throw new BadRequestException('Gagal mengambil daftar yang diikuti');
    }

    return {
      followings: result.value,
    };
  }
}
