import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import * as path from 'node:path';
import * as fs from 'node:fs';

// Ładowanie zmiennych środowiskowych z pliku .env (root lub backend/)
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '..', '.env'),
  path.resolve(process.cwd(), 'backend', '.env')
];

for (const p of envPaths) {
  if (fs.existsSync(p)) {
    try {
      if (typeof process.loadEnvFile === 'function') {
        process.loadEnvFile(p);
      }
    } catch {
      // ignore
    }
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });
  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`[NestJS Backend] Application is running on: http://localhost:${port}`);
  if (process.env.GOOGLE_CLIENT_ID) {
    console.log(`[NestJS Backend] Google OAuth Client ID załadowany z .env: ${process.env.GOOGLE_CLIENT_ID.slice(0, 12)}...`);
  } else {
    console.log(`[NestJS Backend] Brak GOOGLE_CLIENT_ID w .env (możesz dodać go w pliku .env)`);
  }
}
await bootstrap();
