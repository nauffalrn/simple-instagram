import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm'; // Tambahkan import and
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { DrizzleInstance } from '../db';
import { posts } from '../db/schema';
import { Either, ErrorRegister, left, right } from '../helper/either';
import { UsersService } from '../users/users.service';
import { CreatePostDto } from './dto/create-post.dto';
import { Post } from './entities/post.entity';

type CreatePostResult = Either<ErrorRegister.InputanSalah | Error, Post>;
type DeletePostResult = Either<ErrorRegister.PostNotFound, void>;
type FindPostsByUserIdResult = Either<ErrorRegister.ProfilePrivate | ErrorRegister.UserNotFound, Post[]>;

@Injectable()
export class PostsService {
  constructor(
    private readonly usersService: UsersService,
    @Inject('DB') private db: DrizzleInstance // Inject DB
  ) {}

  async create(userId: string, createPostDto: CreatePostDto): Promise<CreatePostResult> {
    try {
      const postId = uuidv4();

      // Simpan post ke database
      const [newPost] = await this.db
        .insert(posts)
        .values({
          id: postId,
          userId: userId,
          pictureUrl: createPostDto.pictureUrl,
          caption: createPostDto.caption || '',
        })
        .returning();

      // Map database result ke entity
      const postEntity: Post = {
        id: newPost.id,
        userId: newPost.userId,
        pictureUrl: newPost.pictureUrl,
        caption: newPost.caption || '',
        createdAt: newPost.createdAt,
        isDeleted: newPost.isDeleted,
      };

      return right(postEntity);
    } catch (error) {
      console.error('Error creating post:', error);
      return left(new ErrorRegister.InputanSalah('Gagal membuat post'));
    }
  }

  async delete(userId: string, postId: string): Promise<DeletePostResult> {
    // Cek apakah post ada dan milik user tersebut
    const postToDelete = await this.db.select().from(posts).where(eq(posts.id, postId)).limit(1);

    if (postToDelete.length === 0 || postToDelete[0].userId !== userId) {
      return left(new ErrorRegister.PostNotFound());
    }

    const post = postToDelete[0];

    // Update status post menjadi deleted
    await this.db.update(posts).set({ isDeleted: true }).where(eq(posts.id, postId));

    // Hapus file gambar jika ada
    try {
      // Ambil filename dari pictureUrl
      const filename = post.pictureUrl.split('/').pop();
      if (filename) {
        const filePath = path.join(process.cwd(), 'uploads', filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (error) {
      console.error('Error saat menghapus file gambar:', error);
    }

    return right(undefined);
  }

  async findByUserId(viewerId: string, userId: string): Promise<FindPostsByUserIdResult> {
    const canViewResult = await this.usersService.canViewUserProfile(viewerId, userId);

    if (canViewResult.isLeft()) {
      return left(canViewResult.error);
    }

    if (!canViewResult.value) {
      return left(new ErrorRegister.ProfilePrivate());
    }

    // Perbaikan query dengan menggunakan and() untuk menggabungkan kondisi
    const postsResult = await this.db
      .select()
      .from(posts)
      .where(and(eq(posts.userId, userId), eq(posts.isDeleted, false)));

    // Map database results ke entities
    const postEntities = postsResult.map((post) => ({
      id: post.id,
      userId: post.userId,
      pictureUrl: post.pictureUrl,
      caption: post.caption || '',
      createdAt: post.createdAt,
      isDeleted: post.isDeleted,
    }));

    return right(postEntities);
  }
}
