import { Module } from '@nestjs/common';
import { PaymentsModule } from './payments/payments.module.js';
import { WebhooksModule } from './webhooks/webhooks.module.js';
import { WebsocketsModule } from './websockets/websockets.module.js';
import { DatabaseModule } from './database/database.module.js';

// Módulo raiz: só compõe os módulos de domínio e de infraestrutura.
@Module({
  imports: [DatabaseModule, PaymentsModule, WebhooksModule, WebsocketsModule],
})
export class AppModule {}
