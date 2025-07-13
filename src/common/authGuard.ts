import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { GuardSchema } from './auth.schema';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}
  canActivate(context: ExecutionContext): boolean {
    const request: Request = context.switchToHttp().getRequest();
    const token = request.headers['authorization'];

    let validation: string;
    try {
      validation = GuardSchema.parse(token);
      return true;
    } catch (error) {
      throw new UnauthorizedException(JSON.parse(error)[0].message);
    }
  }
}
