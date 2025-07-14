import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../common/authGuard';
import { ErrorRegister } from '../helper/either';
import { UploadsService } from '../uploads/uploads.service';
import { CreatePostDto } from './dto/create-post.dto';
import { PostsService } from './posts.service';

@Controller('posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly uploadsService: UploadsService
  ) {}

  @UseGuards(AuthGuard)
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(@Request() req, @Body() createPostDto: CreatePostDto, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Gambar harus diunggah');
    }

    // Generate URL untuk file yang diupload
    const pictureUrl = this.uploadsService.getFileUrl(file.filename);

    // Buat objek lengkap untuk post
    const postData: CreatePostDto = {
      pictureUrl,
      caption: createPostDto.caption || '',
    };

    const userId = req.user.sub;
    const result = await this.postsService.create(userId, postData);

    if (result.isLeft()) {
      if (result.error instanceof ErrorRegister.InputanSalah) {
        throw new BadRequestException(result.error.message);
      }
      throw new BadRequestException('Gagal membuat post');
    }

    return {
      message: 'Post berhasil dibuat',
      post: result.value,
    };
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  async delete(@Request() req, @Param('id') postId: string) {
    const userId = req.user.sub;
    const result = await this.postsService.delete(userId, postId);

    if (result.isLeft()) {
      if (result.error instanceof ErrorRegister.PostNotFound) {
        throw new NotFoundException(result.error.message);
      }
      throw new BadRequestException('Gagal menghapus post');
    }

    return {
      message: 'Post berhasil dihapus',
    };
  }

  @Get('user/:userId')
  async getUserPosts(@Request() req, @Param('userId') userId: string) {
    // Jika user terautentikasi, gunakan ID-nya, jika tidak, gunakan 'guest'
    const viewerId = req.user?.sub || 'guest';
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
