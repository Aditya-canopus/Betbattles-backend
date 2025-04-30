import { Injectable, NotFoundException } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentService {
  private stripe: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET_KEY'), {});
  }

  async addCard(userId: number, paymentMethodId: string) {
    const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          stripe_customer_id: true, // 👈 This must be selected explicitly
        },
      });
      
    if (!user) {
      throw new NotFoundException('User not found');
    }

    let customerId = user.stripe_customer_id;

    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.name,
      });

      customerId = customer.id;

      await this.prisma.user.update({
        where: { id: userId },
        data: { stripe_customer_id: customerId },
      });
    }

    // Attach payment method to customer
    await this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // Retrieve method details
    const paymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodId);

    await this.prisma.paymentMethod.create({
      data: {
        user_id: userId,
        type: 'card',
        last_four: paymentMethod.card?.last4 ?? '',
        payment_token: paymentMethod.id,
        // Optionally store: brand, exp_month, exp_year if needed
      },
    });

    return { message: 'Card added successfully.' };
  }
}
