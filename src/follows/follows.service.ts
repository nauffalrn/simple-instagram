import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Follow } from './entities/follow.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FollowsService {
  private follows: Follow[] = [];

  async followUser(followerId: string, followingId: string): Promise<Follow> {
    if (followerId === followingId) {
      throw new BadRequestException('Tidak bisa mengikuti diri sendiri');
    }

    const existingFollow = this.follows.find(
      follow => follow.followerId === followerId && follow.followingId === followingId
    );

    if (existingFollow) {
      throw new BadRequestException('Sudah mengikuti pengguna ini');
    }

    const follow = new Follow({
      id: uuidv4(),
      followerId,
      followingId,
    });

    this.follows.push(follow);
    return follow;
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    const followIndex = this.follows.findIndex(
      follow => follow.followerId === followerId && follow.followingId === followingId
    );

    if (followIndex === -1) {
      throw new NotFoundException('Belum mengikuti pengguna ini');
    }

    this.follows.splice(followIndex, 1);
  }

  async getFollowers(userId: string): Promise<string[]> {
    const followers = this.follows.filter(follow => follow.followingId === userId);
    return followers.map(follow => follow.followerId);
  }

  async getFollowings(userId: string): Promise<string[]> {
    const followings = this.follows.filter(follow => follow.followerId === userId);
    return followings.map(follow => follow.followingId);
  }
}