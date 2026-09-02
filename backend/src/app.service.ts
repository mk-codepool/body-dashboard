import { Injectable, Optional } from '@nestjs/common';
import { StorageService } from './storage/storage.service.js';

@Injectable()
export class AppService {
  private readonly startTime = Date.now();

  constructor(@Optional() private readonly storageService?: StorageService) {}

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
      storage: this.storageService?.getStorageStatus() ?? { type: 'file-json', connected: true },
    };
  }

  getInfo() {
    return {
      name: 'NestJS Backend Service',
      status: 'healthy',
      endpoints: [
        { path: '/', method: 'GET', description: 'Greeting endpoint' },
        { path: '/api/health', method: 'GET', description: 'Health check probe with storage diagnostics' },
        { path: '/api/info', method: 'GET', description: 'API service information' },
        { path: '/api/auth/config', method: 'GET', description: 'Google OAuth client configuration' },
        { path: '/api/auth/google', method: 'POST', description: 'Google OAuth GIS authentication' },
        { path: '/api/auth/me', method: 'GET', description: 'Get current user profile' },
        { path: '/api/layout', method: 'GET', description: 'Get dashboard widgets layout configuration' },
        { path: '/api/layout', method: 'PUT', description: 'Update and persist dashboard widgets layout' },
        { path: '/api/layout/reset', method: 'POST', description: 'Reset layout to defaults in JSON/MongoDB' },
        { path: '/api/measurements', method: 'GET', description: 'Get list of all biometric measurements' },
        { path: '/api/measurements', method: 'POST', description: 'Create and persist new measurement' },
        { path: '/api/measurements/:id', method: 'GET', description: 'Get single measurement by ID' },
        { path: '/api/measurements/:id', method: 'PUT', description: 'Update measurement by ID' },
        { path: '/api/measurements/:id', method: 'DELETE', description: 'Delete measurement by ID' },
        { path: '/api/measurements/reset', method: 'POST', description: 'Reset measurements to defaults in JSON/MongoDB' },
      ],
      storage: this.storageService?.getStorageStatus() ?? { type: 'file-json', connected: true },
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
