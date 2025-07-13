import {
  Controller,
  Post,
  Body,
  Delete,
  Param,
  Get,
  UsePipes,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import {
  createPostSchema,
  deletePostSchema,
  viewPostsSchema,
} from './schemas/post.schema';
import { ErrorRegister } from '../helper/either';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  async create(@Body() postData: any) {
    const { userId, ...createPostDto } = postData;
    const result = await this.postsService.create(userId, createPostDto);

    if (result.isLeft()) {
      throw new BadRequestException('Gagal membuat post');
    }

    return {
      message: 'Post berhasil dibuat',
      post: result.value,
    };
  }

  @Delete(':id')
  async delete(@Body() deleteData: any, @Param('id') postId: string) {
    const { userId } = deleteData;
    const result = await this.postsService.delete(userId, postId);

    if (result.isLeft()) {
      throw new NotFoundException(result.error.message);
    }

    return {
      message: 'Post berhasil dihapus',
    };
  }

  @Get('user/:userId')
  async getUserPosts(@Body() viewData: any, @Param('userId') userId: string) {
    const { viewerId } = viewData;
    const result = await this.postsService.findByUserId(viewerId, userId);

    if (result.isLeft()) {
      if (result.error instanceof ErrorRegister.ProfilePrivate) {
        throw new ForbiddenException(result.error.message);
      }
      if (result.error instanceof ErrorRegister.UserNotFound) {
        throw new NotFoundException(result.error.message);
      }
      throw new BadRequestException('Gagal mengambil daftar post');
    }

    return {
      posts: result.value,
    };
  }
}
