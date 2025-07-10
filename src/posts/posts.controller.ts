import {
  Controller,
  Post,
  Body,
  Delete,
  Param,
  Get,
  ForbiddenException,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  async create(
    @Body('userId') userId: string,
    @Body() createPostDto: CreatePostDto,
  ) {

    const post = await this.postsService.create(userId, createPostDto);
    return {
      message: 'Post berhasil dibuat',
      post,
    };
  }

  @Delete(':id')
  async delete(@Body('userId') userId: string, @Param('id') postId: string) {
 
    await this.postsService.delete(userId, postId);
    return {
      message: 'Post berhasil dihapus',
    };
  }

  @Get('user/:userId')
  async getUserPosts(
    @Body('viewerId') viewerId: string,
    @Param('userId') userId: string,
  ) {
   
    try {
      const posts = await this.postsService.findByUserId(viewerId, userId);
      return {
        posts,
      };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        return {
          message: error.message,
          posts: [],
        };
      }
      throw error;
    }
  }
}
