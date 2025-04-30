import { IsInt } from 'class-validator';

export class KycUploadDto {
  @IsInt()
  userId: number;
}