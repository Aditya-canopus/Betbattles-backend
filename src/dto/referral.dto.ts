import { IsEmail, IsNotEmpty } from 'class-validator';

export class ReferralDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}