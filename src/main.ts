import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Valida todo DTO de entrada: remove campos extras, rejeita campos
  // desconhecidos e converte tipos (ex.: query string "10" -> number 10).
  // stopAtFirstError: uma mensagem por campo, sem repetir a mesma falha.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: true,
    }),
  );

  // Formato de erro único para toda a API (ver common/filters).
  app.useGlobalFilters(new AllExceptionsFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('payments-hub-nestjs')
    .setDescription('API de recebimento e consulta de pagamentos (portfólio)')
    .setVersion('0.1.0')
    .addTag('webhooks', 'Recebimento de eventos de pagamento do gateway')
    .addTag('payments', 'Consulta de pagamentos')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
