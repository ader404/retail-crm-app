import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class PasswordPolicyService {
  private readonly MIN_LENGTH = 12;
  private readonly HISTORY_COUNT = 5;

  constructor(private prisma: PrismaService) {}

  validatePasswordStrength(password: string): void {
    const errors: string[] = [];

    if (password.length < this.MIN_LENGTH) {
      errors.push(`Password must be at least ${this.MIN_LENGTH} characters`);
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors.join('. '));
    }
  }

  async checkPasswordHistory(
    userId: string,
    newPassword: string,
  ): Promise<void> {
    const history = await this.prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: this.HISTORY_COUNT,
    });

    for (const record of history) {
      const matches = await bcrypt.compare(newPassword, record.password);
      if (matches) {
        throw new BadRequestException(
          'Cannot reuse recent passwords. Please choose a different password.',
        );
      }
    }
  }

  async savePasswordHistory(
    userId: string,
    hashedPassword: string,
  ): Promise<void> {
    await this.prisma.passwordHistory.create({
      data: { userId, password: hashedPassword },
    });

    const history = await this.prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (history.length > this.HISTORY_COUNT) {
      const toDelete = history.slice(this.HISTORY_COUNT);
      await this.prisma.passwordHistory.deleteMany({
        where: { id: { in: toDelete.map((h) => h.id) } },
      });
    }
  }
}
