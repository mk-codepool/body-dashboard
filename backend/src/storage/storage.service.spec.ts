import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StorageService } from './storage.service.js';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StorageService],
    }).compile();

    service = module.get<StorageService>(StorageService);
    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('powinien zostać zainicjalizowany', () => {
    expect(service).toBeDefined();
  });

  it('powinien zwracać status magazynu danych (fallback do JSON bez MONGODB_URI)', () => {
    const status = service.getStorageStatus();
    expect(status).toBeDefined();
    expect(status.type).toBe('file-json');
    expect(status.connected).toBe(false);
  });

  it('powinien poprawnie obsługiwać i sanityzować profil użytkownika', async () => {
    const testUser = {
      id: 'test_user_safe$inject!ion',
      name: 'Tester',
      email: 'test@example.com',
      provider: 'google' as const,
      gender: 'female' as const,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    const saved = await service.saveUser(testUser);
    expect(saved.id).toBe('test_user_safe_inject_ion');

    const retrieved = await service.getUser('test_user_safe$inject!ion');
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe('Tester');
    expect(retrieved?.gender).toBe('female');
  });

  it('powinien zwracać domyślny layout dla użytkownika', async () => {
    const layout = await service.getLayout('test_user_layout');
    expect(Array.isArray(layout)).toBe(true);
    expect(layout.length).toBeGreaterThan(5);
    expect(layout.some(w => w.id === 'weight')).toBe(true);
  });

  it('powinien poprawnie zapisywać i odczytywać pomiary użytkownika', async () => {
    const testRecords = [
      {
        id: 'm_unit_test',
        date: '2026-09-02',
        time: '12:00',
        weight: 75.5,
        totalBodyWater: 60.0,
        overfat: 14.5,
        muscleMass: 42.0,
        boneMass: 3.5,
        bmi: 22.5,
        kcal: 1850,
        urineKetones: 'trace',
        ketoneValue: 0.5,
        ketoneLevel: 'trace' as const,
      },
    ];

    await service.saveMeasurements(testRecords, 'test_user_measurements');
    const loaded = await service.getMeasurements('test_user_measurements');
    expect(loaded).toBeDefined();
    expect(loaded.length).toBe(1);
    expect(loaded[0].weight).toBe(75.5);
    expect(loaded[0].id).toBe('m_unit_test');
  });
});
