import { Inject, Injectable } from '@nestjs/common';
import { UploadApiResponse, v2 as cloudinaryType } from 'cloudinary';

@Injectable()
export class UploadsService {
  constructor(@Inject('CLOUDINARY') private cloudinary: typeof cloudinaryType) {}

  async uploadToCloudinary(file: Express.Multer.File): Promise<string> {
    return new Promise((resolve, reject) => {
      this.cloudinary.uploader
        .upload_stream({ folder: 'simple-instagram' }, (error: any, result: UploadApiResponse) => {
          if (error) return reject(error);
          resolve(result.secure_url);
        })
        .end(file.buffer);
    });
  }
}
