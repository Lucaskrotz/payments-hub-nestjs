import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Payment, PaymentStatus } from '../../payments/entities/payment.entity.js';
import { PaymentsGateway } from './payments.gateway.js';

// O Server do Socket.IO só existe depois que o Nest inicializa o gateway.
// Nos testes unitários injetamos um emissor falso no campo privado.
function setServer(gateway: PaymentsGateway, server: { emit: (...args: unknown[]) => unknown }) {
  (gateway as unknown as { server: typeof server }).server = server;
}

describe('PaymentsGateway', () => {
  const payment = {
    id: 7,
    eventId: 'evt_7',
    amount: '42.00',
    status: PaymentStatus.CONFIRMED,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Payment;

  let gateway: PaymentsGateway;

  beforeEach(() => {
    gateway = new PaymentsGateway();
  });

  it('emite payment.confirmed somente com os campos públicos', () => {
    const emit = vi.fn();
    setServer(gateway, { emit });

    gateway.notifyPaymentConfirmed(payment);

    expect(emit).toHaveBeenCalledWith('payment.confirmed', {
      id: 7,
      eventId: 'evt_7',
      amount: '42.00',
      status: PaymentStatus.CONFIRMED,
    });
  });

  it('não propaga falha na emissão (o pagamento já foi salvo)', () => {
    setServer(gateway, {
      emit: () => {
        throw new Error('socket down');
      },
    });

    expect(() => gateway.notifyPaymentConfirmed(payment)).not.toThrow();
  });
});
