import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { PaymentStatus } from '../entities/payment.entity.js';

export const MAX_PAGE_SIZE = 100;

export class ListPaymentsQueryDto {
  @ApiPropertyOptional({ enum: PaymentStatus, description: 'Filtra pelo status do pagamento' })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  // Query string chega como texto ("2"). @Type converte para número antes da validação.
  // Ordem dos decorators: o de baixo roda primeiro. Com stopAtFirstError, @IsInt fica por último
  // na pilha (roda antes), para "abc" gerar "deve ser inteiro" e não "não pode ser menor que 1".
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @IsInt()
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: MAX_PAGE_SIZE })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  @IsInt()
  limit: number = 20;
}
