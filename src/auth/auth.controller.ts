import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UsePipes,
  ValidationPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseIntPipe,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response } from 'express'; 
import { UserDto } from '../dto/user.dto';
import { KycUploadDto } from '../dto/kyc-upload.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from './auth.guard';
import { JwtPayload } from './types/jwt-payload.interface';
import { ReferralDto } from 'src/dto/referral.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UsePipes(new ValidationPipe({ transform: true }))
  async signup(@Body() body: UserDto) {
    try {
      const { email, password, name, dob, username, avatar_id } = body;
      return await this.authService.signup(email, password, name, new Date(dob), username, avatar_id);
    } catch (error) {
      throw error;
    }
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    try {
      const { email, password } = body;
      return await this.authService.login(email, password);
    } catch (error) {
      throw error;
    }
  }

  @Get('check-username/:username')
  @UsePipes(new ValidationPipe({ transform: true }))
  async checkUsername(@Param('username') username: string) {
    try {
      return await this.authService.checkUsernameExists(username);
    } catch (error) {
      throw error;
    }
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    try {
      return await this.authService.forgotPassword(email);
    } catch (error) {
      throw error;
    }
  }

  @Post('verify-reset-code')
  async verifyResetCode(@Body() body: { email: string; code: string }) {
    try {
      return await this.authService.verifyResetCode(body.email, body.code);
    } catch (error) {
      throw error;
    }
  }

  @Post('reset-password')
  async resetPassword(
    @Body('token') token: string,
    @Body('password') password: string,
    @Body('cpassword') cpassword: string,
  ) {
    try {
      return await this.authService.resetPassword(token, password, cpassword);
    } catch (error) {
      throw error;
    }
  }

  @Post('upload-id')
  @UsePipes(new ValidationPipe({ transform: true }))
  @UseInterceptors(
    FileInterceptor('idDocument', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          return cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (!allowedTypes.includes(file.mimetype)) {
          return cb(new BadRequestException('Invalid file type. Only JPEG, PNG, and PDF are allowed.'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadId(
    @Body('userId', ParseIntPipe) userId: number,
    @UploadedFile() idDocument: Express.Multer.File,
  ) {
    try {
      if (!idDocument) {
        throw new BadRequestException('ID document file is required.');
      }
      return await this.authService.verifyIdCard(userId, idDocument.path);
    } catch (error) {
      throw error;
    }
  }

  @Post('generate-referral-code')
  @UseGuards(JwtAuthGuard)
  async generateReferralCode(@Request() req: { user: JwtPayload }, @Body() body: ReferralDto) {
    try {
      const userId = req.user.sub;
      return await this.authService.sendReferralCode(userId, body.email);
    } catch (error) {
      throw error;
    }
  }
}
