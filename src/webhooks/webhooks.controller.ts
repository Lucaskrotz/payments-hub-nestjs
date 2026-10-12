import { Body, Controller, HttpStatus, Post, Res } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ErrorResponseDto } from '../common/dto/error-response.dto.js';
import { PaymentResponseDto, toPaymentResponse } from '../payments/dto/payment-response.dto.js';
import { PaymentWebhookDto } from './dto/payment-webhook.dto.js';
import { WebhooksService } from './webhooks.service.js';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('payment')
  @ApiOperation({
    summary: 'Recebe um evento de pagamento do gateway (idempotente)',
    description:
      'Mesmo eventId + mesmo conteúdo retorna 200 sem alterar nada. ' +
      'Mesmo eventId + conteúdo diferente retorna 409. Evento novo retorna 201 e, se CONFIRMED, emite payment.confirmed no WebSocket.',
  })
  @ApiCreatedResponse({ type: PaymentResponseDto, description: 'Evento novo: pagamento criado' })
  @ApiOkResponse({ type: PaymentResponseDto, description: 'Evento repetido com o mesmo conteúdo: nada foi alterado' })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Payload inválido (campo ausente, tipo errado, enum inválido ou campo extra)' })
  @ApiConflictResponse({ type: ErrorResponseDto, description: 'Mesmo eventId com conteúdo diferente' })
  @ApiInternalServerErrorResponse({ type: ErrorResponseDto, description: 'Falha interna (detalhes ficam só no log)' })
  async receivePayment(
    @Body() dto: PaymentWebhookDto,
    // passthrough: true deixa o Nest montar o corpo; aqui escolhemos só o status HTTP.
    @Res({ passthrough: true }) res: Response,
  ): Promise<PaymentResponseDto> {
    const { outcome, payment } = await this.webhooksService.handlePaymentEvent(dto);
    res.status(outcome === 'CREATED' ? HttpStatus.CREATED : HttpStatus.OK);
    return toPaymentResponse(payment);
  }
}
