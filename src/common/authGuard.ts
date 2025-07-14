import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token autentikasi tidak ditemukan');
    }

    try {
      // Hapus parameter secret - biarkan JwtService menggunakan konfigurasi global
      const payload = await this.jwtService.verifyAsync(token);

      // Menyimpan payload di request agar bisa diakses controller
      request['user'] = payload;
      return true;
    } catch (error) {
      console.error('JWT Error:', error.message);
      throw new UnauthorizedException('Token tidak valid atau kedaluwarsa');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
