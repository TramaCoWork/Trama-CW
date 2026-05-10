import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);

  // Usar Winston como logger global de NestJS
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Trama Cowork API')
    .setDescription('Marketplace de profesionales — API REST')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = config.get<number>('PORT') ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`App running on http://localhost:${port}`);
  console.log(`Docs at http://localhost:${port}/docs`);
}
bootstrap();
