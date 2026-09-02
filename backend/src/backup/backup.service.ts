import { Injectable, BadRequestException } from '@nestjs/common';
import { StorageService } from '../storage/storage.service.js';
import type { DashboardWidgetConfig, MeasurementRecord } from '../storage/storage.service.js';
import type { UserDto } from '../auth/dto/user.dto.js';

export interface BackupExportPayload {
  version: 1;
  app: 'body-dashboard';
  exportedAt: string;
  userId?: string;
  includedTypes: string[];
  data: {
    measurements?: MeasurementRecord[];
    layout?: DashboardWidgetConfig[];
    user?: Partial<UserDto>;
  };
}

export interface BackupImportResult {
  success: boolean;
  importedTypes: string[];
  measurementsCount: number;
  totalMeasurements: number;
  layoutCount: number;
  userUpdated: boolean;
  message: string;
}

@Injectable()
export class BackupService {
  constructor(private readonly storageService: StorageService) {}

  async exportBackup(types?: string[], userId?: string): Promise<BackupExportPayload> {
    const selectedTypes = (types && types.length > 0)
      ? types
      : ['measurements', 'layout', 'user'];

    const payload: BackupExportPayload = {
      version: 1,
      app: 'body-dashboard',
      exportedAt: new Date().toISOString(),
      userId: userId || 'guest',
      includedTypes: selectedTypes,
      data: {},
    };

    if (selectedTypes.includes('measurements')) {
      payload.data.measurements = await this.storageService.getMeasurements(userId);
    }

    if (selectedTypes.includes('layout')) {
      payload.data.layout = await this.storageService.getLayout(userId);
    }

    if (selectedTypes.includes('user')) {
      const user = await this.storageService.getUser(userId || 'guest');
      if (user) {
        payload.data.user = {
          gender: user.gender,
          name: user.name,
          locale: user.locale,
        };
      }
    }

    return payload;
  }

  async importBackup(backupData: any, userId?: string): Promise<BackupImportResult> {
    if (!backupData || typeof backupData !== 'object') {
      throw new BadRequestException('Nieprawidłowy format pliku kopii zapasowej JSON.');
    }

    // Obsługa zarówno formatu ustrukturyzowanego { data: { measurements, layout, user } }
    // jak i bezpośredniego { measurements, layout, user }
    const data = backupData.data && typeof backupData.data === 'object'
      ? backupData.data
      : backupData;

    const importedTypes: string[] = [];
    let importedMeasurementsCount = 0;
    let totalMeasurementsCount = 0;
    let layoutCount = 0;
    let userUpdated = false;

    // 1. IMPORT UKŁADU KAFELKÓW (LAYOUT)
    // Nadpisuje bieżący układ pulpitu użytkownika
    if (Array.isArray(data.layout) && data.layout.length > 0) {
      await this.storageService.saveLayout(data.layout, userId);
      importedTypes.push('layout');
      layoutCount = data.layout.length;
    }

    // 2. IMPORT POMIARÓW BIOMETRII
    // Nadpisuje rekordy o tym samym ID, dopisuje nowe, zachowuje porządek chronologiczny
    if (Array.isArray(data.measurements)) {
      const current = await this.storageService.getMeasurements(userId);
      const map = new Map<string, MeasurementRecord>(current.map(m => [m.id, m]));

      for (const record of data.measurements) {
        if (record && typeof record === 'object') {
          const id = record.id || `m_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          map.set(id, { ...map.get(id), ...record, id });
        }
      }

      // Sortowanie chronologiczne malejąco (najnowsze pomiary na początku)
      const merged = Array.from(map.values()).sort((a, b) => {
        const dtA = `${a.date || ''} ${a.time || ''}`;
        const dtB = `${b.date || ''} ${b.time || ''}`;
        return dtB.localeCompare(dtA);
      });

      await this.storageService.saveMeasurements(merged, userId);
      importedTypes.push('measurements');
      importedMeasurementsCount = data.measurements.length;
      totalMeasurementsCount = merged.length;
    }

    // 3. IMPORT DANYCH PROFILU / PREFERENCJI
    if (data.user && typeof data.user === 'object') {
      const currentUser = await this.storageService.getUser(userId || 'guest');
      if (currentUser) {
        let changed = false;
        if (data.user.gender && (data.user.gender === 'male' || data.user.gender === 'female')) {
          currentUser.gender = data.user.gender;
          changed = true;
        }
        if (changed) {
          await this.storageService.saveUser(currentUser);
          userUpdated = true;
          importedTypes.push('user');
        }
      }
    }

    if (importedTypes.length === 0) {
      throw new BadRequestException('Plik nie zawierał żadnych rozpoznawalnych danych do zaimportowania (pomiary, układ lub profil).');
    }

    return {
      success: true,
      importedTypes,
      measurementsCount: importedMeasurementsCount,
      totalMeasurements: totalMeasurementsCount,
      layoutCount,
      userUpdated,
      message: `Pomyślnie zaimportowano: ${importedTypes.join(', ')}.`,
    };
  }

  async clearMeasurements(userId?: string): Promise<{ success: boolean; message: string }> {
    await this.storageService.clearMeasurements(userId);
    return {
      success: true,
      message: 'Wszystkie pomiary zostały usunięte z bazy danych.',
    };
  }
}
