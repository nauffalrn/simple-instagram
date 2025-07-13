import { z } from 'zod';

// Skema untuk follow user
export const followUserSchema = z
  .object({
    followerId: z.string().min(1, 'ID pengikut harus diisi'),

    followingId: z.string().min(1, 'ID yang diikuti harus diisi'),
  })
  .refine((data) => data.followerId !== data.followingId, {
    message: 'Tidak bisa mengikuti diri sendiri',
    path: ['followingId'],
  });

export type FollowUserSchemaType = z.infer<typeof followUserSchema>;

// Skema untuk unfollow user
export const unfollowUserSchema = z.object({
  followerId: z.string().min(1, 'ID pengikut harus diisi'),

  followingId: z.string().min(1, 'ID yang diikuti harus diisi'),
});

export type UnfollowUserSchemaType = z.infer<typeof unfollowUserSchema>;
