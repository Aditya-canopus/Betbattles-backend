import { IsString } from "class-validator";

export class AddCardDto {
    @IsString()
    paymentMethodId: string;
  }
  