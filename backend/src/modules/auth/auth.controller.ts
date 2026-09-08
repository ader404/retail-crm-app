import {
  Controller,
  Post,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Get,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { RateLimitGuard } from './rate-limit.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    private readonly rateLimitGuard: RateLimitGuard,
  ) {}

  @Post('login')
  @UseGuards(RateLimitGuard)
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: { email: string; password: string; rememberMe?: boolean },
    @Request() req: any,
  ) {
    const ip = this.getClientIp(req);
    const userAgent = req.headers['user-agent'];

    try {
      const result = await this.authService.login(
        body.email,
        body.password,
        ip,
        userAgent,
        body.rememberMe,
      );
      this.rateLimitGuard.recordAttempt(ip, true);
      return result;
    } catch (error) {
      this.rateLimitGuard.recordAttempt(ip, false);
      throw error;
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async logout(@Body() body: { sessionToken: string }, @Request() req: any) {
    const ip = this.getClientIp(req);
    const userAgent = req.headers['user-agent'];
    await this.authService.logout(body.sessionToken, req.user.id, ip, userAgent);
    return { message: 'Logged out successfully' };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Body() body: { currentPassword: string; newPassword: string },
    @Request() req: any,
  ) {
    const ip = this.getClientIp(req);
    const userAgent = req.headers['user-agent'];
    return this.authService.changePassword(
      req.user.id,
      body.currentPassword,
      body.newPassword,
      ip,
      userAgent,
    );
  }

  @Post('reset-password/:userId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('users.edit')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Param('userId') userId: string,
    @Body() body: { newPassword: string },
    @Request() req: any,
  ) {
    const ip = this.getClientIp(req);
    const userAgent = req.headers['user-agent'];
    return this.authService.resetPassword(
      userId,
      body.newPassword,
      req.user.id,
      ip,
      userAgent,
    );
  }

  @Post('unlock-account/:userId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('users.edit')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async unlockAccount(@Param('userId') userId: string, @Request() req: any) {
    const ip = this.getClientIp(req);
    const userAgent = req.headers['user-agent'];
    return this.authService.unlockAccount(userId, req.user.id, ip, userAgent);
  }

  @Patch('locale')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async updateLocale(@Body() body: { locale: string }, @Request() req: any) {
    return this.authService.updateLocale(req.user.id, body.locale);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getSessions(@Request() req: any) {
    return this.sessionService.listUserSessions(req.user.id);
  }

  @Post('sessions/revoke-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async revokeAllSessions(
    @Body() body: { exceptCurrent?: boolean },
    @Request() req: any,
  ) {
    const currentToken = body.exceptCurrent ? req.headers.authorization?.split(' ')[1] : undefined;
    await this.sessionService.revokeAllUserSessions(req.user.id, currentToken);
    return { message: 'All sessions revoked successfully' };
  }

  @Post('verify-admin-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async verifyAdminPassword(@Body() body: { password: string }) {
    return this.authService.verifyAdminPassword(body.password);
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
}
