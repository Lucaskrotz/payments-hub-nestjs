import { ConflictException } from '@nestjs/common';
import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity.js';
import { PaymentsGateway } from '../websockets/payments/payments.gateway.js';
import { PaymentWebhookDto } from './dto/payment-webhook.dto.js';
import { WebhooksService } from './webhooks.service.js';

// Monta o DTO já normalizado, como o ValidationPipe entregaria ao controller.
function makeDto(overrides: Partial<PaymentWebhookDto> = {}): PaymentWebhookDto {
  return Object.assign(new PaymentWebhookDto(), {
    eventId: 'evt_1',
    amount: '150.00',
    status: PaymentStatus.CONFIRMED,
    ...overrides,
  });
}

// Pagamento "já gravado" no banco, usado como resposta de findOne.
function makeStoredPayment(overrides: Partial<Payment> = {}): Payment {
  return { id: 1, eventId: 'evt_1', amount: '150.00', status: PaymentStatus.CONFIRMED, ...overrides } as Payment;
}

describe('WebhooksService', () => {
  let service: WebhooksService;
  let repository: { findOne: ReturnType<typeof vi.fn>; getEntityManager: ReturnType<typeof vi.fn> };
  let em: { create: ReturnType<typeof vi.fn>; persist: ReturnType<typeof vi.fn>; flush: ReturnType<typeof vi.fn>; fork: ReturnType<typeof vi.fn> };
  let forkFindOneOrFail: ReturnType<typeof vi.fn>;
  let gateway: { notifyPaymentConfirmed: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    forkFindOneOrFail = vi.fn();
    const flush = vi.fn().mockResolvedValue(undefined);

    em = {
      create: vi.fn((_entity, data) => ({ ...data, id: 1 })),
      persist: vi.fn(),
      flush,
      fork: vi.fn(() => ({ findOneOrFail: forkFindOneOrFail })),
    };
    // persist devolve o próprio EntityManager, como no MikroORM (permite persist(...).flush()).
    em.persist.mockReturnValue(em);

    repository = {
      findOne: vi.fn().mockResolvedValue(null),
      getEntityManager: vi.fn(() => em),
    };
    gateway = { notifyPaymentConfirmed: vi.fn() };

    service = new WebhooksService(repository as never, gateway as unknown as PaymentsGateway);
  });

  describe('evento novo', () => {
    it('grava o pagamento e retorna CREATED', async () => {
      const result = await service.handlePaymentEvent(makeDto());

      expect(result.outcome).toBe('CREATED');
      expect(em.create).toHaveBeenCalledWith(Payment, { eventId: 'evt_1', amount: '150.00', status: PaymentStatus.CONFIRMED });
      expect(em.flush).toHaveBeenCalledTimes(1);
    });

    it('notifica quando o pagamento novo está CONFIRMED', async () => {
      const result = await service.handlePaymentEvent(makeDto({ status: PaymentStatus.CONFIRMED }));

      expect(gateway.notifyPaymentConfirmed).toHaveBeenCalledTimes(1);
      expect(gateway.notifyPaymentConfirmed).toHaveBeenCalledWith(result.payment);
    });

    it.each([PaymentStatus.PENDING, PaymentStatus.FAILED])('não notifica quando o status novo é %s', async (status) => {
      await service.handlePaymentEvent(makeDto({ status }));

      expect(em.flush).toHaveBeenCalledTimes(1);
      expect(gateway.notifyPaymentConfirmed).not.toHaveBeenCalled();
    });
  });

  describe('evento repetido (mesmo eventId e mesmo conteúdo)', () => {
    beforeEach(() => {
      repository.findOne.mockResolvedValue(makeStoredPayment());
    });

    it('retorna DUPLICATE sem gravar de novo', async () => {
      const result = await service.handlePaymentEvent(makeDto());

      expect(result.outcome).toBe('DUPLICATE');
      expect(result.payment.id).toBe(1);
      expect(em.flush).not.toHaveBeenCalled();
    });

    it('não notifica de novo', async () => {
      await service.handlePaymentEvent(makeDto());

      expect(gateway.notifyPaymentConfirmed).not.toHaveBeenCalled();
    });
  });

  describe('conflito (mesmo eventId com conteúdo diferente)', () => {
    beforeEach(() => {
      repository.findOne.mockResolvedValue(makeStoredPayment());
    });

    it('rejeita com ConflictException quando o valor muda', async () => {
      await expect(service.handlePaymentEvent(makeDto({ amount: '99.00' }))).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejeita com ConflictException quando o status muda', async () => {
      await expect(service.handlePaymentEvent(makeDto({ status: PaymentStatus.FAILED }))).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('não grava nem notifica em caso de conflito', async () => {
      await expect(service.handlePaymentEvent(makeDto({ amount: '99.00' }))).rejects.toThrow();

      expect(em.flush).not.toHaveBeenCalled();
      expect(gateway.notifyPaymentConfirmed).not.toHaveBeenCalled();
    });
  });

  describe('falha na persistência', () => {
    it('propaga erro de banco que não é de unicidade', async () => {
      em.flush.mockRejectedValue(new Error('connection lost'));

      await expect(service.handlePaymentEvent(makeDto())).rejects.toThrow('connection lost');
    });

    it('não notifica quando o commit falha', async () => {
      em.flush.mockRejectedValue(new Error('connection lost'));

      await expect(service.handlePaymentEvent(makeDto())).rejects.toThrow();
      expect(gateway.notifyPaymentConfirmed).not.toHaveBeenCalled();
    });
  });

  describe('corrida (outra requisição gravou o mesmo eventId entre o findOne e o flush)', () => {
    beforeEach(() => {
      em.flush.mockRejectedValue(new UniqueConstraintViolationException('duplicate key value'));
    });

    it('reconsulta o vencedor e retorna DUPLICATE quando o conteúdo é igual', async () => {
      forkFindOneOrFail.mockResolvedValue(makeStoredPayment());

      const result = await service.handlePaymentEvent(makeDto());

      expect(em.fork).toHaveBeenCalledTimes(1);
      expect(result.outcome).toBe('DUPLICATE');
    });

    it('não notifica na requisição que perdeu a corrida (quem venceu é que notifica)', async () => {
      forkFindOneOrFail.mockResolvedValue(makeStoredPayment());

      await service.handlePaymentEvent(makeDto());

      expect(gateway.notifyPaymentConfirmed).not.toHaveBeenCalled();
    });

    it('rejeita com ConflictException quando o vencedor gravou conteúdo diferente', async () => {
      forkFindOneOrFail.mockResolvedValue(makeStoredPayment({ amount: '99.00' }));

      await expect(service.handlePaymentEvent(makeDto())).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
