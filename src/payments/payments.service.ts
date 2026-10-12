import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityRepository, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { ListPaymentsQueryDto } from './dto/list-payments-query.dto.js';
import { PaginatedPaymentsResponseDto } from './dto/paginated-payments-response.dto.js';
import { PaymentResponseDto, toPaymentResponse } from './dto/payment-response.dto.js';
import { Payment } from './entities/payment.entity.js';

@Injectable()
export class PaymentsService {
  constructor(@InjectRepository(Payment) private readonly paymentRepository: EntityRepository<Payment>) {}

  async findAll(query: ListPaymentsQueryDto): Promise<PaginatedPaymentsResponseDto> {
    const where = query.status ? { status: query.status } : {};

    // count + select em uma única chamada: o total serve para calcular totalPages.
    const [payments, total] = await this.paymentRepository.findAndCount(where, {
      orderBy: { id: QueryOrder.DESC },
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
    });

    return {
      data: payments.map(toPaymentResponse),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(id: number): Promise<PaymentResponseDto> {
    const payment = await this.paymentRepository.findOne({ id });
    if (!payment) {
      throw new NotFoundException(`Pagamento ${id} não encontrado`);
    }
    return toPaymentResponse(payment);
  }
}
