import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { PasswordPolicyService } from './password-policy.service';
import { RateLimitGuard } from './rate-limit.guard';
import { JwtStrategy } from './jwt.strategy';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET environment variable is required'); })(),
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionService,
    PasswordPolicyService,
    RateLimitGuard,
    JwtStrategy,
  ],
  exports: [AuthService, SessionService, JwtModule, RateLimitGuard],
})
export class AuthModule {}
