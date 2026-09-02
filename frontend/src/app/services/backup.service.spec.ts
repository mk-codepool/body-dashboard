import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BackupService } from './backup.service';

describe('BackupService', () => {
  let service: BackupService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        BackupService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(BackupService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('powinien poprawnie sparsować i zwalidować plik kopii zapasowej JSON', async () => {
    const backupContent = JSON.stringify({
      version: 1,
      app: 'body-dashboard',
      exportedAt: '2026-09-03T00:00:00.000Z',
      includedTypes: ['measurements', 'layout', 'user'],
      data: {
        measurements: [
          { id: 'm1', date: '2026-09-01', time: '08:00', weight: 75.0 }
        ],
        layout: [
          { id: 'timestamp', col: 1, row: 1, colSpan: 2, rowSpan: 1 }
        ],
        user: {
          gender: 'female'
        }
      }
    });

    const file = new File([backupContent], 'test-backup.json', { type: 'application/json' });
    const preview = await service.parseBackupFile(file);

    expect(preview).toBeDefined();
    expect(preview.fileName).toBe('test-backup.json');
    expect(preview.measurementsCount).toBe(1);
    expect(preview.layoutCount).toBe(1);
    expect(preview.userGender).toBe('female');
  });

  it('powinien rzucić błąd dla niepoprawnego pliku JSON', async () => {
    const invalidFile = new File(['nie-jest-to-json{{{'], 'bad.json', { type: 'application/json' });
    await expect(service.parseBackupFile(invalidFile)).rejects.toThrow();
  });
});
