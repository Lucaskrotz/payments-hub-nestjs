import { ApiProperty } from '@nestjs/swagger';
import { PaymentStatus, type Payment } from '../entities/payment.entity.js';

// Resposta pública: expõe só o necessário (sem createdAt/updatedAt internos de auditoria).
export class PaymentResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'evt_123456' })
  eventId!: string;

  @ApiProperty({ example: '150.00' })
  amount!: string;

  @ApiProperty({ enum: PaymentStatus })
  status!: PaymentStatus;
}

export function toPaymentResponse(payment: Payment): PaymentResponseDto {
  return {
    id: payment.id,
    eventId: payment.eventId,
    amount: payment.amount,
    status: payment.status,
  };
}
