import { Module } from '@nestjs/common';
import { PaymentsGateway } from './payments/payments.gateway.js';

@Module({
  providers: [PaymentsGateway],
  exports: [PaymentsGateway],
})
export class WebsocketsModule {}
