import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';

import { PaymentService } from './payment.service';
import { PaymentProviderFactory } from './payment-provider.factory';
import { PaymentsRepository } from './payments.repository';
import { StripePaymentProvider } from './stripe-payment.provider';

@Module({
  imports: [DatabaseModule],
  providers: [
    PaymentService,
    PaymentsRepository,
    PaymentProviderFactory,
    StripePaymentProvider,
  ],
  exports: [
    PaymentService,
    PaymentsRepository,
    StripePaymentProvider,
  ],
})
export class PaymentsModule {}