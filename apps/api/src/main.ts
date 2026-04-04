import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { seedAdmin } from './database/seeds/admin.seed';
import { seedEstablishment } from './database/seeds/establishment.seed';
import { seedServices } from './database/seeds/services.seed';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Cabeleleila Leila API')
    .setDescription('API para agendamentos de salão de beleza')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addServer('http://localhost:3001', 'Desenvolvimento')
    .addServer('https://api.cabeleleila.com', 'Produção')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  try {
    const dataSource = app.get(DataSource);
    if (dataSource.isInitialized) {
      await seedEstablishment(dataSource);
      await seedAdmin(dataSource);
      await seedServices(dataSource);
    }
  } catch (error) {
    console.error('Erro ao executar seeds:', error);
  }

  const port = process.env.API_PORT ?? 3001;
  await app.listen(port);
  console.log(`🚀 API rodando em http://localhost:${port}`);
  console.log(`📖 Swagger disponível em http://localhost:${port}/api/docs`);
}

void bootstrap();
