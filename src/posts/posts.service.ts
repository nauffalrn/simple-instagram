import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Post } from './entities/post.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';

@Injectable()
export class PostsService {
  private posts: Post[] = [];

  constructor(private readonly usersService: UsersService) {}

  async create(userId: string, createPostDto: CreatePostDto): Promise<Post> {
    const newPost = new Post({
      id: uuidv4(),
      userId,
      pictureUrl: createPostDto.pictureUrl,
      caption: createPostDto.caption,
    });

    this.posts.push(newPost);
    return newPost;
  }

  async delete(userId: string, postId: string): Promise<void> {
    const postIndex = this.posts.findIndex(
      (post) => post.id === postId && post.userId === userId,
    );

    if (postIndex === -1) {
      throw new NotFoundException(
        'Post tidak ditemukan atau Anda tidak memiliki izin',
      );
    }

    this.posts[postIndex].isDeleted = true;
  }

  async findByUserId(viewerId: string, userId: string): Promise<Post[]> {
    const hasAccess = await this.usersService.canViewUserProfile(
      viewerId,
      userId,
    );

    if (!hasAccess) {
      throw new ForbiddenException(
        'Akun ini private. Anda perlu mengikuti pengguna untuk melihat post.',
      );
    }

    return this.posts.filter(
      (post) => post.userId === userId && !post.isDeleted,
    );
  }
}
