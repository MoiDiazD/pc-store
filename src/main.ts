import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { PostgresExceptionFilter } from './common/filters/postgres-exception.filter';
import cookie from '@fastify/cookie';


async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  await app.register(cookie);
  app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
  app.useGlobalFilters(new PostgresExceptionFilter());  
  await app.listen(3000, '0.0.0.0');
}

bootstrap();