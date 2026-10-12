import { Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { toPaymentResponse } from '../../payments/dto/payment-response.dto.js';
import { Payment } from '../../payments/entities/payment.entity.js';

// Namespace próprio: os clientes conectam em http://localhost:3000/payments
@WebSocketGateway({ namespace: '/payments' })
export class PaymentsGateway {
  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(PaymentsGateway.name);

  notifyPaymentConfirmed(payment: Payment): void {
    try {
      // Só os dados que o consumidor precisa, sem campos internos.
      this.server.emit('payment.confirmed', toPaymentResponse(payment));
    } catch (error) {
      // O pagamento já está salvo. Falha na notificação não pode virar erro no webhook.
      this.logger.error(`Falha ao emitir payment.confirmed para eventId=${payment.eventId}`, (error as Error).stack);
    }
  }
}
