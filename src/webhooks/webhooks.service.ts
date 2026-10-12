import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { EntityRepository, UniqueConstraintViolationException } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity.js';
import { PaymentsGateway } from '../websockets/payments/payments.gateway.js';
import { PaymentWebhookDto } from './dto/payment-webhook.dto.js';

export type WebhookOutcome = 'CREATED' | 'DUPLICATE';

export interface ProcessedWebhook {
  outcome: WebhookOutcome;
  payment: Payment;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectRepository(Payment) private readonly paymentRepository: EntityRepository<Payment>,
    private readonly paymentsGateway: PaymentsGateway,
  ) {}

  async handlePaymentEvent(dto: PaymentWebhookDto): Promise<ProcessedWebhook> {
    const result = await this.storeEvent(dto);

    // Chegar aqui significa que o flush já terminou (commit feito).
    // Notificamos só pagamento NOVO e CONFIRMADO: repetições (DUPLICATE) nunca geram evento.
    if (result.outcome === 'CREATED' && result.payment.status === PaymentStatus.CONFIRMED) {
      this.paymentsGateway.notifyPaymentConfirmed(result.payment);
    }
    return result;
  }

  private async storeEvent(dto: PaymentWebhookDto): Promise<ProcessedWebhook> {
    // 1ª barreira: verificação de aplicação (cobre o caso comum, sem tentar escrever).
    const existing = await this.paymentRepository.findOne({ eventId: dto.eventId });
    if (existing) {
      return this.resolveExisting(existing, dto);
    }

    const em = this.paymentRepository.getEntityManager();
    try {
      const payment = em.create(Payment, {
        eventId: dto.eventId,
        amount: dto.amount,
        status: dto.status,
      });
      await em.persist(payment).flush();
      this.logger.log(`Pagamento criado para eventId=${dto.eventId}`);
      return { outcome: 'CREATED', payment };
    } catch (error) {
      // Só tratamos a violação da constraint única. Qualquer outro erro de banco sobe
      // sem ser engolido, para virar HTTP 500 e aparecer nos logs.
      if (!(error instanceof UniqueConstraintViolationException)) {
        throw error;
      }
      // 2ª barreira (corrida): outra requisição gravou o mesmo eventId entre o findOne e o flush.
      // Usamos um fork do EntityManager para não reaproveitar o estado da escrita que falhou.
      this.logger.warn(`Corrida detectada para eventId=${dto.eventId}; reconsultando`);
      const winner = await em.fork().findOneOrFail(Payment, { eventId: dto.eventId });
      return this.resolveExisting(winner, dto);
    }
  }

  // Mesmo eventId + mesmo conteúdo = repetição legítima (ex.: retry do gateway).
  // Mesmo eventId + conteúdo diferente = conflito: não consideramos como processado.
  private resolveExisting(existing: Payment, dto: PaymentWebhookDto): ProcessedWebhook {
    const sameContent = existing.amount === dto.amount && existing.status === dto.status;
    if (sameContent) {
      this.logger.log(`Evento duplicado ignorado eventId=${dto.eventId}`);
      return { outcome: 'DUPLICATE', payment: existing };
    }

    this.logger.warn(`Conflito de conteúdo para eventId=${dto.eventId}`);
    throw new ConflictException('Já existe um evento com este eventId e conteúdo diferente');
  }
}
