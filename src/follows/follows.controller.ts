import { Controller, Post, Delete, Body, Get, Param } from '@nestjs/common';
import { FollowsService } from './follows.service';

@Controller('follows')
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  @Post()
  async followUser(@Body('followerId') followerId: string, @Body('followingId') followingId: string) {
    const follow = await this.followsService.followUser(followerId, followingId);
    return {
      message: 'Berhasil mengikuti pengguna',
      follow,
    };
  }

  @Delete()
  async unfollowUser(@Body('followerId') followerId: string, @Body('followingId') followingId: string) {
    await this.followsService.unfollowUser(followerId, followingId);
    return {
      message: 'Berhasil berhenti mengikuti pengguna',
    };
  }

  @Get('followers/:userId')
  async getFollowers(@Param('userId') userId: string) {
    const followerIds = await this.followsService.getFollowers(userId);
    return {
      followers: followerIds,
    };
  }

  @Get('followings/:userId')
  async getFollowings(@Param('userId') userId: string) {
    const followingIds = await this.followsService.getFollowings(userId);
    return {
      followings: followingIds,
    };
  }
}