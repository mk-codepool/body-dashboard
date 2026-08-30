import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  private readonly startTime = Date.now();

  getHello(): string {
    return 'NestJS Backend API is active!';
  }

  getHealth() {
    return {
      status: 'ok',
      service: 'backend',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      version: '1.0.0',
    };
  }

  getInfo() {
    return {
      name: 'NestJS Backend Service',
      status: 'healthy',
      endpoints: [
        { path: '/', method: 'GET', description: 'Greeting endpoint' },
        { path: '/api/health', method: 'GET', description: 'Health check probe' },
        { path: '/api/info', method: 'GET', description: 'API service information' },
      ],
      environment: process.env.NODE_ENV || 'development',
    };
  }
}

