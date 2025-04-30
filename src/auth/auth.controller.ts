import { Controller, Post, Body, Get, Param, UsePipes, ValidationPipe, UseInterceptors, UploadedFile, BadRequestException, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
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
    const { email, password, name, dob, username, avatar_id } = body;
    return this.authService.signup(email, password, name, new Date(dob), username, avatar_id);
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const { email, password } = body;
    return this.authService.login(email, password);
  }

  @Get('check-username/:username')
  @UsePipes(new ValidationPipe({ transform: true }))
  async checkUsername(@Param('username') username: string) {
    return this.authService.checkUsernameExists(username);
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

//   @Get('reset-password-form')
//   async resetPasswordForm(@Query('token') token: string, @Res({ passthrough: false }) res: Response) {
//     return this.authService.resetPasswordForm(token, res);
//   }

  @Post('reset-password')
  async resetPassword(
    @Body('token') token: string,
    @Body('password') password: string,
    @Body('cpassword') cpassword: string,
  ) {
    return this.authService.resetPassword(token, password, cpassword);
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
    if (!idDocument) {
      throw new BadRequestException('ID document file is required.');
    }
    return this.authService.verifyIdCard(userId, idDocument.path);
  }

  @Post('generate-referral-code')
  @UseGuards(JwtAuthGuard)
  async generateReferralCode(@Request() req: { user: JwtPayload }, @Body() body: ReferralDto) {
    const userId = req.user.sub; // Now TypeScript knows req.user has a 'sub' field
    return this.authService.sendReferralCode(userId, body.email);  
  }
}