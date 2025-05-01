import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as AppleStrategy } from 'passport-apple';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as passport from 'passport';

@Injectable()
export class SocialStrategy {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {
    this.initFacebookStrategy();
    this.initGoogleStrategy();
    this.initAppleStrategy();
  }

  private initFacebookStrategy() {
    passport.use(
      new FacebookStrategy(
        {
          clientID: this.configService.get<string>('FACEBOOK_CLIENT_ID'),
          clientSecret: this.configService.get<string>('FACEBOOK_CLIENT_SECRET'),
          callbackURL: `${this.configService.get<string>('FRONTEND_URL')}/auth/facebook/callback`,
          profileFields: ['id', 'displayName', 'emails'],
        },
        async (accessToken, refreshToken, profile, done) => {
          const { id, displayName, emails } = profile;
          const email = emails[0].value;
          let user = await this.prisma.user.findUnique({ where: { email } });
          if (!user) {
            user = await this.prisma.user.create({
              data: {
                email,
                name: displayName,
                username: `${displayName.toLowerCase().replace(/\s/g, '')}_${id.slice(-4)}`,
                facebook_id: id,
              },
            });
          } else if (!user.facebook_id) {
            await this.prisma.user.update({ where: { id: user.id }, data: { facebook_id: id } });
          }
          const payload = { sub: user.id, email: user.email };
          const token = this.jwtService.sign(payload);
          done(null, { user, token });
        },
      ),
    );
  }

  private initGoogleStrategy() {
    passport.use(
      new GoogleStrategy(
        {
          clientID: this.configService.get<string>('GOOGLE_CLIENT_ID'),
          clientSecret: this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
          callbackURL: `${this.configService.get<string>('FRONTEND_URL')}/auth/google/callback`,
          scope: ['profile', 'email'],
        },
        async (accessToken, refreshToken, profile, done) => {
          const { id, displayName, emails } = profile;
          const email = emails[0].value;
          let user = await this.prisma.user.findUnique({ where: { email } });
          if (!user) {
            user = await this.prisma.user.create({
              data: {
                email,
                name: displayName,
                username: `${displayName.toLowerCase().replace(/\s/g, '')}_${id.slice(-4)}`,
                google_id: id,
              },
            });
          } else if (!user.google_id) {
            await this.prisma.user.update({ where: { id: user.id }, data: { google_id: id } });
          }
          const payload = { sub: user.id, email: user.email };
          const token = this.jwtService.sign(payload);
          done(null, { user, token });
        },
      ),
    );
  }

  private initAppleStrategy() {
    passport.use(
        new AppleStrategy(
          {
            clientID: this.configService.get<string>('APPLE_CLIENT_ID'),
            teamID: this.configService.get<string>('APPLE_TEAM_ID'),
            keyID: this.configService.get<string>('APPLE_KEY_ID'),
            privateKeyString: this.configService.get<string>('APPLE_PRIVATE_KEY'), // Use privateKeyString, not privateKeyPath
            callbackURL: `${this.configService.get<string>('FRONTEND_URL')}/auth/apple/callback`,
            scope: ['name', 'email'],
          },
          async (accessToken, refreshToken, profile, done) => {
            // your verify logic
          }
        )
      );      
  }
}