import { ArgumentsHost, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let res: { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
  const req = { method: 'POST', url: '/webhooks/payment' };

  // Simula o ArgumentsHost que o Nest entrega ao filtro numa requisição HTTP.
  function host(): ArgumentsHost {
    return {
      switchToHttp: () => ({ getResponse: () => res, getRequest: () => req }),
    } as unknown as ArgumentsHost;
  }

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('mantém o status e a mensagem de HttpException (409)', () => {
    filter.catch(new ConflictException('conteúdo diferente'), host());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 409, error: 'Conflict', message: 'conteúdo diferente', path: '/webhooks/payment' }),
    );
  });

  it('mantém a lista de mensagens de erro de validação (400)', () => {
    filter.catch(new BadRequestException(['amount inválido', 'status inválido']), host());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: ['amount inválido', 'status inválido'] }),
    );
  });

  it('mantém o 404 de recurso inexistente', () => {
    filter.catch(new NotFoundException('Pagamento 9 não encontrado'), host());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404, error: 'Not Found' }));
  });

  it('converte erro inesperado em 500 genérico, sem vazar a mensagem interna', () => {
    filter.catch(new Error('password authentication failed for user "payments"'), host());

    expect(res.status).toHaveBeenCalledWith(500);
    const body = res.json.mock.calls[0][0];
    expect(body.message).toBe('Erro interno do servidor');
    expect(JSON.stringify(body)).not.toContain('password');
  });

  it('inclui timestamp ISO em todas as respostas', () => {
    filter.catch(new NotFoundException('x'), host());

    const body = res.json.mock.calls[0][0];
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });
});
