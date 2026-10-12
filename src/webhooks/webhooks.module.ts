import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Payment } from '../payments/entities/payment.entity.js';
import { WebsocketsModule } from '../websockets/websockets.module.js';
import { WebhooksController } from './webhooks.controller.js';
import { WebhooksService } from './webhooks.service.js';

@Module({
  imports: [MikroOrmModule.forFeature([Payment]), WebsocketsModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
