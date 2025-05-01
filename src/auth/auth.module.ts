import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaService } from '../prisma/prisma.service';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { PassportModule } from '@nestjs/passport';
import passport from 'passport';
import { SocialStrategy } from './strategies/social.strategy';
import { SocialController } from './social/social.controller';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController, SocialController],
  providers: [AuthService, PrismaService, JwtStrategy, SocialStrategy],
})
export class AuthModule {}