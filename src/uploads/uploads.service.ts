import { Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import '../uploads/cloudinary.config';

@Injectable()
export class UploadsService {
  async uploadToCloudinary(file: Express.Multer.File): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'simple-instagram' },
        (error, result: UploadApiResponse) => {
          if (error) {
            console.error('Cloudinary upload failed:', error);
            return reject(error);
          }
          resolve(result.secure_url);
        }
      );
      uploadStream.end(file.buffer);
    });
  }
}
