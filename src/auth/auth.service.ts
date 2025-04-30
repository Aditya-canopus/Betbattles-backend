import { Injectable, BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';  // ✅ For res: Response
import * as crypto from 'crypto';    // ✅ For crypto.randomBytes
import * as nodemailer from 'nodemailer';  // ✅ For nodemailer.createTransport
import * as path from 'path';
import { UserDto } from '../dto/user.dto';
import * as fs from 'fs';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly ID_ANALYZER_API_KEY: string;
  private readonly ID_ANALYZER_API_URL = 'https://api.idanalyzer.com';
    constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.ID_ANALYZER_API_KEY = this.configService.get<string>('ID_ANALYZER_API_KEY');
  }

  async signup(
    email: string,
    password: string,
    name: string,
    dob: Date,
    username: string,
    avatar_id?: string,
  ) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });
    if (existingUser) {
      throw new BadRequestException('Email or username already exists');
    }
  
    const hashedPassword = await bcrypt.hash(password, 10);
  
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        dob,
        username,
        avatar_id: avatar_id || null, // Store avatar if provided
        photo_url: avatar_id ? `${process.env.BASE_URL}/avatars/${avatar_id}.png` : null,
      },
    });
  
    const payload = { sub: user.id, email: user.email };
    const token = this.jwtService.sign(payload);
  
    return { user, token };
  }
  
  async login(email: string, password: string) {
    // Find the user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const payload = { sub: user.id, email: user.email };
    const token = this.jwtService.sign(payload);

    return { user, token };
  }

  async checkUsernameExists(username: string): Promise<{ exists: boolean; username: string }> {
    if (username.length < 3) {
        throw new BadRequestException('Username must be at least 3 characters long');
    }
    const user = await this.prisma.user.findFirst({
      where: {
        username: { equals: username, mode: 'insensitive' }, // Case-insensitive search
      },
    });
    return { exists: !!user, username };
  }

  async forgotPassword(email: string) {
    if (!email) {
      throw new BadRequestException('Email is required.');
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new NotFoundException('Email not found.');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        reset_token: resetToken,
        reset_token_expiry: resetTokenExpiry,
      },
    });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.ADMIN_EMAIL_USER,
        pass: process.env.ADMIN_EMAIL_PASS,
      },
    });

    const emailHTML = `
      <div style="width: 700px; margin: 0 auto;">
        <div style="background: #2f353a; padding: 15px; text-align: left;">
        </div>
        <div style="padding: 15px; text-align: center;">
          <strong style="font-size: 18px;">Dear: ${user.name}</strong>
          <p style="margin-top:5px;">Click below to reset your password:</p>
          <a href="${resetLink}" style="margin-top:20px; display:inline-block; padding:10px 15px; background:#2f353a; color:white; text-decoration:none; border-radius:5px;">
            Reset Password
          </a>
        </div>
      </div>`;

    await transporter.sendMail({
      from: process.env.ADMIN_EMAIL_USER,
      to: email,
      subject: 'Password Reset Request',
      html: emailHTML,
    });

    return { message: 'Password reset link sent to your email.' };
  }

//   async resetPasswordForm(token: string, res: Response) {
//     if (!token) {
//       return res.status(400).send('Invalid or missing reset token.');
//     }

//     const filePath = path.join(__dirname, '../../public/html/resetScreen.html');
//     return res.sendFile(filePath);
// }

  async resetPassword(token: string, password: string, cpassword: string) {
    if (!token || !password || !cpassword) {
      throw new BadRequestException('All fields are required.');
    }

    if (password !== cpassword) {
      throw new BadRequestException('Passwords do not match.');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        reset_token: token,
        reset_token_expiry: {
          gt: new Date(), // token is not expired
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        reset_token: null,
        reset_token_expiry: null,
      },
    });

    return { message: 'Password successfully reset. Please login with your new password.' };
  }

  async verifyIdCard(userId: number, documentPath: string) {
    try {
      // Check if user exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        throw new NotFoundException('User not found.');
      }

      // Read the document file and encode it to base64
      const documentBuffer = fs.readFileSync(documentPath);
      const documentBase64 = documentBuffer.toString('base64');

      // Make request to ID Analyzer Core API
      const payload = {
        apikey: this.ID_ANALYZER_API_KEY,
        file_base64: documentBase64,
        authenticate: true,
        // region: 'IN', // Changed to India
        // document_type: 'national_id', // Aadhaar is a national ID; adjust if ID Analyzer supports 'aadhaar' specifically
      };

      const response = await axios.post(this.ID_ANALYZER_API_URL, payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      const result = response.data;

      if (result.error) {
        throw new BadRequestException(`ID Analyzer error: ${result.error.message}`);
      }

      const { result: docResult, authentication } = result;
      const documentType = docResult.documentType || 'Unknown';
      const documentNumber = docResult.documentNumber || 'Unknown';
      const isAuthentic = authentication && authentication.score > 0.5;

      await this.prisma.kycVerification.upsert({
        where: { user_id: userId },
        update: {
          document_type: documentType,
          document_number: documentNumber,
          verification_status: isAuthentic ? 'verified' : 'failed',
          verification_data: result,
          updated_at: new Date(),
        },
        create: {
          user_id: userId,
          document_type: documentType,
          document_number: documentNumber,
          verification_status: isAuthentic ? 'verified' : 'failed',
          verification_data: result,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      return {
        message: isAuthentic ? 'ID verified successfully.' : 'ID verification failed.',
        documentType,
        documentNumber,
        verificationStatus: isAuthentic ? 'verified' : 'failed',
      };
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to verify ID card.');
    } finally {
      if (fs.existsSync(documentPath)) {
        fs.unlinkSync(documentPath);
      }
    }
  }

  // Generate a referral code based on username and dob
  private async generateReferralCode(username: string, dob: Date): Promise<string> {
    let attempt = 0;
    let referralCode: string;

    while (true) {
      // Base referral code: username + dob (YYYYMMDD) + optional attempt number
      const dobString = dob.toISOString().split('T')[0].replace(/-/g, ''); // e.g., "19900101"
      referralCode = `${username}${dobString}${attempt > 0 ? attempt : ''}`.toUpperCase();

      // Check if the referral code already exists
      const existingUser = await this.prisma.user.findFirst({
        where: { referral_code: referralCode },
      });

      if (!existingUser) {
        break; // Unique referral code found
      }

      attempt++; // Increment attempt and try again
    }

    return referralCode;
  }

  // Send referral code via email
  async sendReferralCode(userId: number, email: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (user.referral_code) {
      throw new BadRequestException('User already has a referral code.');
    }

    // Validate friend email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Invalid friend email address.');
    }

    // Check if friend email is not the same as user's email
    if (email.toLowerCase() === user.email.toLowerCase()) {
      throw new BadRequestException('Friend email cannot be the same as your email.');
    }

    // Generate a unique referral code
    const referralCode = await this.generateReferralCode(user.username, user.dob);

    // Update the user's referral_code in the database
    await this.prisma.user.update({
      where: { id: userId },
      data: { referral_code: referralCode },
    });

    // Read the HTML template
    const templatePath = path.join(process.cwd(), 'public/html/referral-code-email.html');
    let emailHTML = fs.readFileSync(templatePath, 'utf-8');

    // Replace placeholders with actual values
    emailHTML = emailHTML.replace('{{name}}', user.name).replace('{{referralCode}}', referralCode);

    // Send the email to both user and friend
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.ADMIN_EMAIL_USER,
        pass: process.env.ADMIN_EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.ADMIN_EMAIL_USER,
      to: [user.email, email],
      subject: 'Your Referral Code',
      html: emailHTML,
    });

    return { message: 'Referral code generated and sent to your email and your friend.', referralCode };
  }
}