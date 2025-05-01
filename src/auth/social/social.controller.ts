import { Controller, Get, Request, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth/social')
export class SocialController {
  @Get('login/facebook')
  @UseGuards(AuthGuard('facebook'))
  async facebookLogin(@Request() req) {}

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookCallback(@Request() req, @Res() res: Response) {
    const { user, token } = req.user;
    res.redirect(`${process.env.FRONTEND_URL}?token=${token}`);
  }

  @Get('login/google')
  @UseGuards(AuthGuard('google'))
  async googleLogin(@Request() req) {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Request() req, @Res() res: Response) {
    const { user, token } = req.user;
    res.redirect(`${process.env.FRONTEND_URL}?token=${token}`);
  }

  @Get('login/apple')
  @UseGuards(AuthGuard('apple'))
  async appleLogin(@Request() req) {}

  @Get('apple/callback')
  @UseGuards(AuthGuard('apple'))
  async appleCallback(@Request() req, @Res() res: Response) {
    const { user, token } = req.user;
    res.redirect(`${process.env.FRONTEND_URL}?token=${token}`);
  }
}