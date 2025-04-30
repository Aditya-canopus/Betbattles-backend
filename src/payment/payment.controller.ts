import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { AuthGuard } from '@nestjs/passport';
import { AddCardDto } from 'src/dto/add-card.dto'; 

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('add-card')
  @UseGuards(AuthGuard('jwt'))
  async addCard(@Body() body: AddCardDto, @Request() req) {
    const userId = req.user.sub;
    return this.paymentService.addCard(userId, body.paymentMethodId);
  }
}
