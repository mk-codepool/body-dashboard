import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { BackupController } from './backup.controller.js';
import { BackupService } from './backup.service.js';
import { StorageService } from '../storage/storage.service.js';

describe('BackupController', () => {
  let controller: BackupController;
  let storageService: StorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BackupController],
      providers: [BackupService, StorageService],
    }).compile();

    controller = module.get<BackupController>(BackupController);
    storageService = module.get<StorageService>(StorageService);
    await storageService.onModuleInit();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('powinien wyeksportować kopię danych z metadanymi i wybranymi typami', async () => {
    const backup = await controller.exportBackup('measurements,layout,user', 'test_user_backup');
    expect(backup).toBeDefined();
    expect(backup.version).toBe(1);
    expect(backup.app).toBe('body-dashboard');
    expect(backup.includedTypes).toContain('measurements');
    expect(backup.includedTypes).toContain('layout');
    expect(backup.includedTypes).toContain('user');
    expect(backup.data).toBeDefined();
    expect(Array.isArray(backup.data.layout)).toBe(true);
  });

  it('powinien wyczyścić pomiary, a następnie zaimportować plik i przywrócić stan', async () => {
    const testUserId = 'test_user_restore';

    // 1. Zapisujemy przykładowy pomiar i eksportujemy
    const sampleRecord = {
      id: 'm_test_1',
      date: '2026-09-01',
      time: '08:00',
      weight: 75.5,
      totalBodyWater: 60.0,
      overfat: 14.0,
      muscleMass: 42.0,
      boneMass: 3.5,
      bmi: 22.5,
      kcal: 1800,
      urineKetones: 'Negatywny',
      ketoneValue: 0.1,
      ketoneLevel: 'negative' as const,
    };
    await storageService.saveMeasurements([sampleRecord], testUserId);

    const exported = await controller.exportBackup(undefined, testUserId);
    expect(exported.data.measurements?.length).toBe(1);

    // 2. Czyścimy pomiary
    const clearRes = await controller.clearMeasurements(testUserId);
    expect(clearRes.success).toBe(true);
    const afterClear = await storageService.getMeasurements(testUserId);
    expect(afterClear.length).toBe(0);

    // 3. Importujemy wyeksportowaną kopię
    const importRes = await controller.importBackup(exported, testUserId);
    expect(importRes.success).toBe(true);
    expect(importRes.measurementsCount).toBe(1);

    // 4. Sprawdzamy czy stan został wiernie odtworzony
    const restored = await storageService.getMeasurements(testUserId);
    expect(restored.length).toBe(1);
    expect(restored[0].id).toBe('m_test_1');
    expect(restored[0].weight).toBe(75.5);
  });

  it('powinien nadpisać istniejące pomiary o tym samym id', async () => {
    const testUserId = 'test_user_overwrite';
    const oldRecord = {
      id: 'm_same_id',
      date: '2026-09-01',
      time: '08:00',
      weight: 80.0,
      totalBodyWater: 55.0,
      overfat: 18.0,
      muscleMass: 38.0,
      boneMass: 3.2,
      bmi: 24.5,
      kcal: 1750,
      urineKetones: 'Negatywny',
      ketoneValue: 0.1,
      ketoneLevel: 'negative' as const,
    };
    await storageService.saveMeasurements([oldRecord], testUserId);

    // Kopia z nową wagą dla tego samego id
    const newBackup = {
      version: 1,
      app: 'body-dashboard',
      data: {
        measurements: [
          {
            ...oldRecord,
            weight: 82.5,
            notes: 'Zaktualizowano wagę',
          },
        ],
      },
    };

    await controller.importBackup(newBackup, testUserId);
    const measurements = await storageService.getMeasurements(testUserId);
    expect(measurements.length).toBe(1);
    expect(measurements[0].id).toBe('m_same_id');
    expect(measurements[0].weight).toBe(82.5);
    expect(measurements[0].notes).toBe('Zaktualizowano wagę');
  });
});
