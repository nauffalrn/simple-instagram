import { z } from 'zod';

// Skema untuk membuat post
export const createPostSchema = z.object({
  userId: z.string().min(1, 'User ID harus diisi'),

  pictureUrl: z
    .url('Format URL tidak valid'),

  caption: z.string().optional(),
});

export type CreatePostSchemaType = z.infer<typeof createPostSchema>;

// Skema untuk menghapus post
export const deletePostSchema = z.object({
  userId: z.string().min(1, 'User ID harus diisi'),
});

export type DeletePostSchemaType = z.infer<typeof deletePostSchema>;

// Skema untuk view posts
export const viewPostsSchema = z.object({
  viewerId: z.string().min(1, 'Viewer ID harus diisi'),
});

export type ViewPostsSchemaType = z.infer<typeof viewPostsSchema>;
