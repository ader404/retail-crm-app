import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class SessionService {
  constructor(private prisma: PrismaService) {}

  async createSession(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
    rememberMe: boolean = false,
  ) {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();

    if (rememberMe) {
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days
    } else {
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    }

    const session = await this.prisma.session.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });

    return session;
  }

  async validateSession(token: string) {
    const session = await this.prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session) {
      return null;
    }

    if (session.expiresAt < new Date()) {
      await this.revokeSession(token);
      return null;
    }

    return session;
  }

  async refreshSession(token: string, rememberMe: boolean = false) {
    const session = await this.validateSession(token);

    if (!session) {
      return null;
    }

    const expiresAt = new Date();
    if (rememberMe) {
      expiresAt.setDate(expiresAt.getDate() + 30);
    } else {
      expiresAt.setDate(expiresAt.getDate() + 7);
    }

    return this.prisma.session.update({
      where: { id: session.id },
      data: { expiresAt },
    });
  }

  async revokeSession(token: string) {
    await this.prisma.session.delete({
      where: { token },
    });
  }

  async listUserSessions(userId: string) {
    return this.prisma.session.findMany({
      where: {
        userId,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeAllUserSessions(userId: string, exceptToken?: string) {
    await this.prisma.session.deleteMany({
      where: {
        userId,
        ...(exceptToken ? { token: { not: exceptToken } } : {}),
      },
    });
  }

  async cleanupExpiredSessions() {
    await this.prisma.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  }
}
