import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

interface HttpExceptionBody {
  message?: string | string[];
  error?: string;
}

// Único ponto que monta as respostas de erro. Assim todo erro tem o mesmo formato.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = 'Internal Server Error';
    let message: string | string[] = 'Erro interno do servidor';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else {
        const httpBody = body as HttpExceptionBody;
        message = httpBody.message ?? exception.message;
        error = httpBody.error ?? error;
      }
    } else {
      // Erro inesperado: registra o detalhe no log, mas nunca devolve ao cliente.
      // Mensagens de banco ou stack trace podem vazar estrutura interna.
      this.logger.error(
        `Erro não tratado em ${req.method} ${req.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    res.status(status).json({
      statusCode: status,
      error: status === HttpStatus.INTERNAL_SERVER_ERROR ? 'Internal Server Error' : error,
      message,
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}
