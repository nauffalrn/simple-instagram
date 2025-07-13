import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Either, ErrorRegister, left, right } from '../helper/either';
import { Follow } from './entities/follow.entity';

// Type definitions for service results
type FollowUserResult = Either<ErrorRegister.CannotFollowSelf | ErrorRegister.AlreadyFollowing, Follow>;

type UnfollowUserResult = Either<ErrorRegister.NotFollowing, void>;

type GetFollowersResult = Either<never, string[]>;
type GetFollowingsResult = Either<never, string[]>;

@Injectable()
export class FollowsService {
  private follows: Follow[] = [];

  async followUser(followerId: string, followingId: string): Promise<FollowUserResult> {
    if (followerId === followingId) {
      return left(new ErrorRegister.CannotFollowSelf());
    }

    const existingFollow = this.follows.find(
      (follow) => follow.followerId === followerId && follow.followingId === followingId
    );

    if (existingFollow) {
      return left(new ErrorRegister.AlreadyFollowing());
    }

    const follow = new Follow({
      id: uuidv4(),
      followerId,
      followingId,
    });

    this.follows.push(follow);
    return right(follow);
  }

  async unfollowUser(followerId: string, followingId: string): Promise<UnfollowUserResult> {
    const followIndex = this.follows.findIndex(
      (follow) => follow.followerId === followerId && follow.followingId === followingId
    );

    if (followIndex === -1) {
      return left(new ErrorRegister.NotFollowing());
    }

    this.follows.splice(followIndex, 1);
    return right(undefined);
  }

  async getFollowers(userId: string): Promise<GetFollowersResult> {
    const followers = this.follows.filter((follow) => follow.followingId === userId);
    return right(followers.map((follow) => follow.followerId));
  }

  async getFollowings(userId: string): Promise<GetFollowingsResult> {
    const followings = this.follows.filter((follow) => follow.followerId === userId);
    return right(followings.map((follow) => follow.followingId));
  }
}
