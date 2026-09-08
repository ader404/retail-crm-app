import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface LoginAttempt {
  ip: string;
  attempts: number;
  firstAttempt: Date;
  lockedUntil?: Date;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private attempts: Map<string, LoginAttempt> = new Map();
  private readonly MAX_ATTEMPTS = 5;
  private readonly WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  private readonly LOCKOUT_MS = 30 * 60 * 1000; // 30 minutes

  constructor(private prisma: PrismaService) {
    // Cleanup old attempts every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = this.getClientIp(request);

    const attempt = this.attempts.get(ip);
    const now = new Date();

    if (attempt) {
      if (attempt.lockedUntil && attempt.lockedUntil > now) {
        const remainingMs = attempt.lockedUntil.getTime() - now.getTime();
        const remainingMin = Math.ceil(remainingMs / 60000);
        throw new HttpException(
          `Too many login attempts. Please try again in ${remainingMin} minutes.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      const timeSinceFirst = now.getTime() - attempt.firstAttempt.getTime();
      if (timeSinceFirst > this.WINDOW_MS) {
        this.attempts.delete(ip);
      } else if (attempt.attempts >= this.MAX_ATTEMPTS) {
        attempt.lockedUntil = new Date(now.getTime() + this.LOCKOUT_MS);
        throw new HttpException(
          `Too many login attempts. Please try again in 30 minutes.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    return true;
  }

  recordAttempt(ip: string, success: boolean) {
    if (success) {
      this.attempts.delete(ip);
      return;
    }

    const attempt = this.attempts.get(ip);
    const now = new Date();

    if (!attempt) {
      this.attempts.set(ip, {
        ip,
        attempts: 1,
        firstAttempt: now,
      });
    } else {
      const timeSinceFirst = now.getTime() - attempt.firstAttempt.getTime();
      if (timeSinceFirst > this.WINDOW_MS) {
        this.attempts.set(ip, {
          ip,
          attempts: 1,
          firstAttempt: now,
        });
      } else {
        attempt.attempts++;
      }
    }
  }

  async checkAccountLock(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isLocked: true, failedLoginAttempts: true },
    });

    if (user?.isLocked) {
      throw new HttpException(
        'Account is locked. Please contact administrator.',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  async recordFailedLogin(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { failedLoginAttempts: true },
    });

    const newAttempts = (user?.failedLoginAttempts || 0) + 1;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: newAttempts,
        isLocked: newAttempts >= 5,
      },
    });
  }

  async resetFailedLogins(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: 0 },
    });
  }

  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }

  private cleanup() {
    const now = new Date();
    for (const [ip, attempt] of this.attempts.entries()) {
      const timeSinceFirst = now.getTime() - attempt.firstAttempt.getTime();
      if (
        timeSinceFirst > this.WINDOW_MS &&
        (!attempt.lockedUntil || attempt.lockedUntil < now)
      ) {
        this.attempts.delete(ip);
      }
    }
  }
}
