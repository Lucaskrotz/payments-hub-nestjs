import { ApiProperty } from '@nestjs/swagger';

// Formato único de erro da API. Só para documentação: quem monta a resposta é o AllExceptionsFilter.
export class ErrorResponseDto {
  @ApiProperty({ example: 409 })
  statusCode!: number;

  @ApiProperty({ example: 'Conflict' })
  error!: string;

  @ApiProperty({
    description: 'Texto único, ou lista de mensagens quando é erro de validação',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: 'Já existe um evento com este eventId e conteúdo diferente',
  })
  message!: string | string[];

  @ApiProperty({ example: '/webhooks/payment' })
  path!: string;

  @ApiProperty({ example: '2026-10-12T19:34:24.000Z' })
  timestamp!: string;
}
