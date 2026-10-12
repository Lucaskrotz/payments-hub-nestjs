import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../common/dto/error-response.dto.js';
import { ListPaymentsQueryDto } from './dto/list-payments-query.dto.js';
import { PaginatedPaymentsResponseDto } from './dto/paginated-payments-response.dto.js';
import { PaymentResponseDto } from './dto/payment-response.dto.js';
import { PaymentsService } from './payments.service.js';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista pagamentos, com filtro por status e paginação (máximo 100 por página)' })
  @ApiOkResponse({ type: PaginatedPaymentsResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Filtro ou paginação inválidos' })
  @ApiInternalServerErrorResponse({ type: ErrorResponseDto })
  findAll(@Query() query: ListPaymentsQueryDto): Promise<PaginatedPaymentsResponseDto> {
    return this.paymentsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca um pagamento pelo id' })
  @ApiOkResponse({ type: PaymentResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Id não numérico' })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Pagamento não encontrado' })
  @ApiInternalServerErrorResponse({ type: ErrorResponseDto })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<PaymentResponseDto> {
    return this.paymentsService.findOne(id);
  }
}
