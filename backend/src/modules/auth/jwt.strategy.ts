import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET environment variable is required'); })(),
    });
  }

  async validate(payload: { id: string; email: string; role: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        isLocked: true,
        mustChangePassword: true,
        locale: true,
        pageAccess: true,
      },
    });

    if (!user || !user.isActive || user.isLocked) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
