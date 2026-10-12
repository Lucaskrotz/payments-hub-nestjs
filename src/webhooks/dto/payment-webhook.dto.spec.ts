import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { PaymentStatus } from '../../payments/entities/payment.entity.js';
import { PaymentWebhookDto } from './payment-webhook.dto.js';

// Mesmas opções do ValidationPipe global em main.ts.
const validationOptions = { whitelist: true, forbidNonWhitelisted: true, stopAtFirstError: true };

async function validatePayload(payload: Record<string, unknown>) {
  const dto = plainToInstance(PaymentWebhookDto, payload);
  const errors = await validate(dto, validationOptions);
  return { dto, errors };
}

const validPayload = { eventId: 'evt_1', amount: '150.00', status: PaymentStatus.CONFIRMED };

describe('PaymentWebhookDto', () => {
  it('aceita um payload válido', async () => {
    const { errors } = await validatePayload(validPayload);

    expect(errors).toHaveLength(0);
  });

  it('normaliza amount sem centavos: "150" vira "150.00"', async () => {
    const { dto, errors } = await validatePayload({ ...validPayload, amount: '150' });

    expect(errors).toHaveLength(0);
    expect(dto.amount).toBe('150.00');
  });

  it('normaliza uma casa decimal: "150.5" vira "150.50"', async () => {
    const { dto } = await validatePayload({ ...validPayload, amount: '150.5' });

    expect(dto.amount).toBe('150.50');
  });

  it('rejeita amount como número (ponto flutuante perde centavos)', async () => {
    const { errors } = await validatePayload({ ...validPayload, amount: 150.5 });

    expect(errors.map((e) => e.property)).toContain('amount');
  });

  it.each(['0', '0.00', '-10.00', '10.123', '1e3', 'abc', '', '12345678901.00'])(
    'rejeita amount inválido: "%s"',
    async (amount) => {
      const { errors } = await validatePayload({ ...validPayload, amount });

      expect(errors.map((e) => e.property)).toContain('amount');
    },
  );

  it('rejeita status fora do enum', async () => {
    const { errors } = await validatePayload({ ...validPayload, status: 'PAGO' });

    expect(errors.map((e) => e.property)).toContain('status');
  });

  it.each([
    ['eventId vazio', { eventId: '' }],
    ['eventId com mais de 255 caracteres', { eventId: 'x'.repeat(256) }],
    ['eventId ausente', { eventId: undefined }],
  ])('rejeita %s', async (_label, override) => {
    const { errors } = await validatePayload({ ...validPayload, ...override });

    expect(errors.map((e) => e.property)).toContain('eventId');
  });

  it('rejeita campo que não está no DTO (forbidNonWhitelisted)', async () => {
    const { errors } = await validatePayload({ ...validPayload, hack: 1 });

    expect(errors.length).toBeGreaterThan(0);
  });
});
