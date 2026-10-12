import { defineEntity, p } from '@mikro-orm/postgresql';

export enum PaymentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
}

const PaymentSchema = defineEntity({
  name: 'Payment',
  properties: {
    id: p.integer().primary(),
    // Identificador do evento no gateway. UNIQUE no banco: garantia final contra duplicidade.
    eventId: p.string().length(255).unique(),
    // decimal (não float) para não perder centavos. Vem como string do banco.
    amount: p.decimal().precision(12).scale(2),
    status: p.enum(() => PaymentStatus),
    createdAt: p.datetime().onCreate(() => new Date()),
    updatedAt: p
      .datetime()
      .onCreate(() => new Date())
      .onUpdate(() => new Date()),
  },
});

export class Payment extends PaymentSchema.class {}
PaymentSchema.setClass(Payment);
