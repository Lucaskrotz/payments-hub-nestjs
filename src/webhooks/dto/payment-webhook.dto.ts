import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { PaymentStatus } from '../../payments/entities/payment.entity.js';

// Completa para 2 casas decimais: "150" -> "150.00", "150.5" -> "150.50".
// Assim o valor recebido bate exatamente com o que o banco devolve (numeric(12,2)).
function normalizeAmount(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const [integerPart, decimalPart = ''] = value.split('.');
  return `${integerPart}.${decimalPart.padEnd(2, '0')}`;
}

export class PaymentWebhookDto {
  @ApiProperty({ example: 'evt_123456', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  eventId!: string;

  // String de propósito: JSON number é ponto flutuante e perde centavos.
  @ApiProperty({ example: '150.00', description: 'Valor como string, até 2 casas decimais, maior que zero' })
  @Transform(({ value }) => normalizeAmount(value))
  @IsString()
  @Matches(/^(?!0+(\.0+)?$)\d{1,10}(\.\d{1,2})?$/, {
    message: 'amount deve ser uma string numérica maior que zero, com até 2 casas decimais',
  })
  amount!: string;

  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.CONFIRMED })
  @IsEnum(PaymentStatus)
  status!: PaymentStatus;
}
