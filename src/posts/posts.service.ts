import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Either, ErrorRegister, left, right } from '../helper/either';
import { UsersService } from '../users/users.service';
import { CreatePostDto } from './dto/create-post.dto';
import { Post } from './entities/post.entity';

type CreatePostResult = Either<ErrorRegister.InputanSalah | Error, Post>;
type DeletePostResult = Either<ErrorRegister.PostNotFound, void>;
type FindPostsByUserIdResult = Either<ErrorRegister.ProfilePrivate | ErrorRegister.UserNotFound, Post[]>;

@Injectable()
export class PostsService {
  private posts: Post[] = [];

  constructor(private readonly usersService: UsersService) {}

  async create(userId: string, createPostDto: CreatePostDto): Promise<CreatePostResult> {
    const newPost = new Post({
      id: uuidv4(),
      userId,
      pictureUrl: createPostDto.pictureUrl,
      caption: createPostDto.caption,
    });

    this.posts.push(newPost);
    return right(newPost);
  }

  async delete(userId: string, postId: string): Promise<DeletePostResult> {
    const postIndex = this.posts.findIndex((post) => post.id === postId && post.userId === userId);

    if (postIndex === -1) {
      return left(new ErrorRegister.PostNotFound());
    }

    const post = this.posts[postIndex];
    this.posts[postIndex].isDeleted = true;

    // Hapus file gambar jika ada
    try {
      // Ambil filename dari pictureUrl (contoh: /uploads/filename.jpg -> filename.jpg)
      const filename = post.pictureUrl.split('/').pop();
      if (filename) {
        const filePath = path.join(process.cwd(), 'uploads', filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (error) {
      console.error('Error saat menghapus file gambar:', error);
      // Lanjutkan proses meskipun gagal menghapus file
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

    const userPosts = this.posts.filter((post) => post.userId === userId && !post.isDeleted);

    return right(userPosts);
  }
}
