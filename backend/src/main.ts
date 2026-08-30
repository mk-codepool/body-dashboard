import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`[NestJS Backend] Application is running on: http://localhost:${port}`);
}
await bootstrap();

