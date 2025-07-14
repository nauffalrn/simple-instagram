import { Injectable } from '@nestjs/common';

@Injectable()
export class UploadsService {
  getFileUrl(filename: string): string {
    return `/uploads/${filename}`;
  }
}
