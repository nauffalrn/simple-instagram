import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { DrizzleInstance } from '../db';
import { follows, users } from '../db/schema';
import { Either, ErrorRegister, left, right } from '../helper/either';
import { UsersService } from '../users/users.service';
import { Follow } from './entities/follow.entity';
import { followUserSchema } from './schemas/follow.schema';

// Type definitions for service results
type FollowUserResult = Either<ErrorRegister.CannotFollowSelf | ErrorRegister.AlreadyFollowing, Follow>;
type UnfollowUserResult = Either<ErrorRegister.NotFollowing, void>;
type GetFollowersResult = Either<
  never,
  { fullName: string | null; username: string | null; pictureUrl: string | null }[]
>;
type GetFollowingsResult = Either<
  never,
  { fullName: string | null; username: string | null; pictureUrl: string | null }[]
>;

@Injectable()
export class FollowsService {
  constructor(
    private readonly usersService: UsersService,
    @Inject('DB') private db: DrizzleInstance
  ) {}

  async followUser(followerId: string, followingId: string): Promise<FollowUserResult> {
    if (followerId === followingId) {
      return left(new ErrorRegister.CannotFollowSelf());
    }

    const validation = followUserSchema.parse({ followerId, followingId });

    // Cek apakah sudah follow
    const existingFollow = await this.db
      .select()
      .from(follows)
      .where(and(eq(follows.followerId, validation.followerId), eq(follows.followingId, validation.followingId)))
      .limit(1);

    if (existingFollow.length > 0) {
      return left(new ErrorRegister.AlreadyFollowing());
    }

    try {
      const inserted = await this.db
        .insert(follows)
        .values({
          id: uuidv4(),
          followerId,
          followingId,
        })
        .onConflictDoNothing({ target: [follows.followerId, follows.followingId] })
        .returning();

      console.log('Inserted:', inserted);

      if (inserted.length === 0) {
        console.log('Conflict occurred, no insert happened');
        return left(new ErrorRegister.AlreadyFollowing());
      }

      const follow = inserted[0];
      return right({
        id: follow.id,
        followerId: follow.followerId,
        followingId: follow.followingId,
        createdAt: follow.createdAt,
      });
    } catch (err) {
      console.error('Database error saat insert follow:', err);
      throw new Error('Insert follow gagal: ' + err.message);
    }
  }

  async unfollowUser(followerId: string, followingId: string): Promise<UnfollowUserResult> {
    // Cek apakah sudah follow
    const existingFollow = await this.db
      .select()
      .from(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
      .limit(1);

    if (existingFollow.length === 0) {
      return left(new ErrorRegister.NotFollowing());
    }

    // Delete follow record
    await this.db.delete(follows).where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));

    return right(undefined);
  }

  async getFollowers(userId: string): Promise<GetFollowersResult> {
    const followerRecords = await this.db
      .select({
        fullName: users.fullName,
        username: users.username,
        pictureUrl: users.pictureUrl,
      })
      .from(follows)
      .innerJoin(users, eq(follows.followerId, users.id))
      .where(eq(follows.followingId, userId));

    // followerRecords sudah hanya berisi 3 field
    return right(followerRecords);
  }

  async getFollowings(userId: string): Promise<GetFollowingsResult> {
    const followingRecords = await this.db
      .select({
        fullName: users.fullName,
        username: users.username,
        pictureUrl: users.pictureUrl,
      })
      .from(follows)
      .innerJoin(users, eq(follows.followingId, users.id))
      .where(eq(follows.followerId, userId));

    // followingRecords sudah hanya berisi 3 field
    return right(followingRecords);
  }
}
