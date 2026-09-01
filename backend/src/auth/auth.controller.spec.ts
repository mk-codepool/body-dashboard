import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { StorageService } from '../storage/storage.service.js';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [AuthService, StorageService],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return auth config', () => {
    const config = controller.getConfig();
    expect(config).toBeDefined();
    expect(config.googleClientId).toBeDefined();
  });

  it('should get current user or fallback to guest', async () => {
    const user = await controller.getMe('guest');
    expect(user).toBeDefined();
    expect(user.id).toBe('guest');
  });
});
