// Comentado talvez precise
/** import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap(); 
*/
/*
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// 1. Importação do ValidationPipe (Vem do NestJS)
import { ValidationPipe } from '@nestjs/common'; 

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Ativando o ValidationPipe globalmente
  app.useGlobalPipes(new ValidationPipe());

  await app.listen(3000);
}
bootstrap();*/

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common'; 

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ 
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  })); 

  app.setGlobalPrefix('v2'); 

app.enableCors({
  origin: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS', 
  credentials: true,
  allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With, nome_operador',
  preflightContinue: false,
  optionsSuccessStatus: 204, 
});

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();