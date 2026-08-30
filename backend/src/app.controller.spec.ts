import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return greeting message', () => {
      expect(appController.getHello()).toBe('NestJS Backend API is active!');
    });

    it('should return health check', () => {
      const health = appController.getHealth();
      expect(health.status).toBe('ok');
      expect(health.service).toBe('backend');
    });

    it('should return info with endpoints', () => {
      const info = appController.getInfo();
      expect(info.status).toBe('healthy');
      expect(info.endpoints.length).toBeGreaterThan(3);
    });
  });
});
