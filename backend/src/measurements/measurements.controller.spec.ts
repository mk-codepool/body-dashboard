import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { MeasurementsController } from './measurements.controller.js';
import { MeasurementsService } from './measurements.service.js';
import { StorageService } from '../storage/storage.service.js';

describe('MeasurementsController', () => {
  let controller: MeasurementsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MeasurementsController],
      providers: [MeasurementsService, StorageService],
    }).compile();

    controller = module.get<MeasurementsController>(MeasurementsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return measurements list', async () => {
    const list = await controller.getAll();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(1);
  });
});
