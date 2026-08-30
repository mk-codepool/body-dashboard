import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { LayoutController } from './layout.controller.js';
import { LayoutService } from './layout.service.js';
import { StorageService } from '../storage/storage.service.js';

describe('LayoutController', () => {
  let controller: LayoutController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LayoutController],
      providers: [LayoutService, StorageService],
    }).compile();

    controller = module.get<LayoutController>(LayoutController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return widgets layout array', async () => {
    const layout = await controller.getLayout();
    expect(Array.isArray(layout)).toBe(true);
    expect(layout.length).toBe(12);
  });
});
