import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionService } from './session.service';
import { PasswordPolicyService } from './password-policy.service';
import { RateLimitGuard } from './rate-limit.guard';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly sessionService: SessionService,
    private readonly passwordPolicy: PasswordPolicyService,
    private readonly rateLimitGuard: RateLimitGuard,
  ) {}

  async login(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
    rememberMe: boolean = false,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.rateLimitGuard.checkAccountLock(user.id);

    if (!user.isActive) {
      await this.logAuditEvent(
        user.id,
        'FAILED_LOGIN',
        'user',
        user.id,
        { reason: 'inactive_account', email },
        ipAddress,
        userAgent,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      await this.rateLimitGuard.recordFailedLogin(user.id);
      await this.logAuditEvent(
        user.id,
        'FAILED_LOGIN',
        'user',
        user.id,
        { reason: 'invalid_password', email },
        ipAddress,
        userAgent,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.rateLimitGuard.resetFailedLogins(user.id);

    const session = await this.sessionService.createSession(
      user.id,
      ipAddress,
      userAgent,
      rememberMe,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.logAuditEvent(
      user.id,
      'LOGIN',
      'user',
      user.id,
      { email, rememberMe },
      ipAddress,
      userAgent,
    );

    const { password: _, ...userPayload } = user;

    const jwtToken = this.jwt.sign(userPayload);

    return {
      access_token: jwtToken,
      session_token: session.token,
      user: {
        ...userPayload,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  async logout(sessionToken: string, userId: string, ipAddress?: string, userAgent?: string) {
    await this.sessionService.revokeSession(sessionToken);
    await this.logAuditEvent(
      userId,
      'LOGOUT',
      'user',
      userId,
      {},
      ipAddress,
      userAgent,
    );
  }

  async validateSession(token: string) {
    return this.sessionService.validateSession(token);
  }

  async updateLocale(userId: string, locale: string) {
    const allowedLocales = ['en', 'fr', 'ar'];
    if (!allowedLocales.includes(locale)) {
      throw new BadRequestException('Unsupported locale');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { locale },
    });

    const { password: _, ...result } = user;
    return result;
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      throw new BadRequestException('Current password is incorrect');
    }

    this.passwordPolicy.validatePasswordStrength(newPassword);

    await this.passwordPolicy.checkPasswordHistory(userId, newPassword);

    const hashedPassword = await this.hashPassword(newPassword);

    await this.passwordPolicy.savePasswordHistory(userId, hashedPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
        mustChangePassword: false,
      },
    });

    await this.sessionService.revokeAllUserSessions(userId);

    await this.logAuditEvent(
      userId,
      'PASSWORD_CHANGE',
      'user',
      userId,
      {},
      ipAddress,
      userAgent,
    );

    return { message: 'Password changed successfully. Please login again.' };
  }

  async resetPassword(
    userId: string,
    newPassword: string,
    adminId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    this.passwordPolicy.validatePasswordStrength(newPassword);

    const hashedPassword = await this.hashPassword(newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
        mustChangePassword: true,
        failedLoginAttempts: 0,
        isLocked: false,
      },
    });

    await this.sessionService.revokeAllUserSessions(userId);

    await this.logAuditEvent(
      adminId,
      'PASSWORD_RESET',
      'user',
      userId,
      { resetBy: adminId },
      ipAddress,
      userAgent,
    );

    return { message: 'Password reset successfully. User must change password on next login.' };
  }

  async unlockAccount(userId: string, adminId: string, ipAddress?: string, userAgent?: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isLocked: false,
        failedLoginAttempts: 0,
      },
    });

    await this.logAuditEvent(
      adminId,
      'ACCOUNT_UNLOCK',
      'user',
      userId,
      { unlockedBy: adminId },
      ipAddress,
      userAgent,
    );

    return { message: 'Account unlocked successfully' };
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  async verifyAdminPassword(password: string): Promise<{ valid: boolean }> {
    const adminPasswordHash = process.env.ADMIN_PASSWORD;

    if (!adminPasswordHash) {
      throw new BadRequestException('Admin password not configured');
    }

    const isValid = await bcrypt.compare(password, adminPasswordHash);

    if (!isValid) {
      throw new UnauthorizedException('Invalid admin password');
    }

    return { valid: true };
  }

  private async logAuditEvent(
    userId: string | null,
    action: string,
    entity: string,
    entityId: string,
    details: any,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId: userId || undefined,
        action,
        entity,
        entityId,
        details,
        ipAddress,
        userAgent,
      },
    });
  }
}
