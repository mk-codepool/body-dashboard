import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { UserDto } from '../auth/dto/user.dto.js';

export interface DashboardWidgetConfig {
  id: string;
  title: string;
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
  minColSpan: number;
  maxColSpan: number;
  minRowSpan: number;
  maxRowSpan: number;
  defaultCol: number;
  defaultRow: number;
  defaultColSpan: number;
  defaultRowSpan: number;
}

export type AlcoholLevel = 'none' | 'light' | 'heavy';
export type DietType = 'light' | 'keto' | 'bad';

export interface MeasurementRecord {
  id: string;
  date: string;
  time: string;
  weight: number;
  totalBodyWater: number;
  overfat: number;
  muscleMass: number;
  boneMass: number;
  bmi: number;
  kcal: number;
  urineKetones: string;
  ketoneValue: number;
  ketoneLevel: 'none' | 'negative' | 'trace' | 'low' | 'moderate' | 'high';
  alcohol?: AlcoholLevel;
  diet?: DietType;
  notes?: string;
}

export const GRID_TOTAL_COLS = 8;
export const GRID_TOTAL_ROWS = 12;

export const DEFAULT_WIDGETS: DashboardWidgetConfig[] = [
  {
    id: 'timestamp',
    title: 'Data i Godzina',
    col: 1,
    row: 1,
    colSpan: 2,
    rowSpan: 1,
    minColSpan: 1,
    maxColSpan: GRID_TOTAL_COLS,
    minRowSpan: 1,
    maxRowSpan: 6,
    defaultCol: 1,
    defaultRow: 1,
    defaultColSpan: 2,
    defaultRowSpan: 1,
  },
  {
    id: 'weight',
    title: 'Waga Ciała',
    col: 3,
    row: 1,
    colSpan: 2,
    rowSpan: 1,
    minColSpan: 1,
    maxColSpan: GRID_TOTAL_COLS,
    minRowSpan: 1,
    maxRowSpan: 6,
    defaultCol: 3,
    defaultRow: 1,
    defaultColSpan: 2,
    defaultRowSpan: 1,
  },
  {
    id: 'tbw',
    title: 'Total Body Water',
    col: 5,
    row: 1,
    colSpan: 1,
    rowSpan: 2,
    minColSpan: 1,
    maxColSpan: GRID_TOTAL_COLS,
    minRowSpan: 1,
    maxRowSpan: 6,
    defaultCol: 5,
    defaultRow: 1,
    defaultColSpan: 1,
    defaultRowSpan: 2,
  },
  {
    id: 'overfat',
    title: 'Overfat (Tłuszcz)',
    col: 6,
    row: 1,
    colSpan: 1,
    rowSpan: 1,
    minColSpan: 1,
    maxColSpan: GRID_TOTAL_COLS,
    minRowSpan: 1,
    maxRowSpan: 6,
    defaultCol: 6,
    defaultRow: 1,
    defaultColSpan: 1,
    defaultRowSpan: 1,
  },
  {
    id: 'muscleMass',
    title: 'Mięśnie',
    col: 7,
    row: 1,
    colSpan: 1,
    rowSpan: 1,
    minColSpan: 1,
    maxColSpan: GRID_TOTAL_COLS,
    minRowSpan: 1,
    maxRowSpan: 6,
    defaultCol: 7,
    defaultRow: 1,
    defaultColSpan: 1,
    defaultRowSpan: 1,
  },
  {
    id: 'boneMass',
    title: 'Kości',
    col: 8,
    row: 1,
    colSpan: 1,
    rowSpan: 1,
    minColSpan: 1,
    maxColSpan: GRID_TOTAL_COLS,
    minRowSpan: 1,
    maxRowSpan: 6,
    defaultCol: 8,
    defaultRow: 1,
    defaultColSpan: 1,
    defaultRowSpan: 1,
  },
  {
    id: 'ketones',
    title: 'Ketony w moczu',
    col: 1,
    row: 2,
    colSpan: 2,
    rowSpan: 1,
    minColSpan: 1,
    maxColSpan: GRID_TOTAL_COLS,
    minRowSpan: 1,
    maxRowSpan: 6,
    defaultCol: 1,
    defaultRow: 2,
    defaultColSpan: 2,
    defaultRowSpan: 1,
  },
  {
    id: 'bmi',
    title: 'BMI',
    col: 3,
    row: 2,
    colSpan: 1,
    rowSpan: 1,
    minColSpan: 1,
    maxColSpan: GRID_TOTAL_COLS,
    minRowSpan: 1,
    maxRowSpan: 6,
    defaultCol: 3,
    defaultRow: 2,
    defaultColSpan: 1,
    defaultRowSpan: 1,
  },
  {
    id: 'kcal',
    title: 'Kcal (BMR)',
    col: 4,
    row: 2,
    colSpan: 1,
    rowSpan: 1,
    minColSpan: 1,
    maxColSpan: GRID_TOTAL_COLS,
    minRowSpan: 1,
    maxRowSpan: 6,
    defaultCol: 4,
    defaultRow: 2,
    defaultColSpan: 1,
    defaultRowSpan: 1,
  },
  {
    id: 'diet',
    title: 'Utrzymanie Diety',
    col: 6,
    row: 2,
    colSpan: 1,
    rowSpan: 1,
    minColSpan: 1,
    maxColSpan: GRID_TOTAL_COLS,
    minRowSpan: 1,
    maxRowSpan: 6,
    defaultCol: 6,
    defaultRow: 2,
    defaultColSpan: 1,
    defaultRowSpan: 1,
  },
  {
    id: 'alcohol',
    title: 'Spożycie Alkoholu',
    col: 7,
    row: 2,
    colSpan: 2,
    rowSpan: 1,
    minColSpan: 1,
    maxColSpan: GRID_TOTAL_COLS,
    minRowSpan: 1,
    maxRowSpan: 6,
    defaultCol: 7,
    defaultRow: 2,
    defaultColSpan: 2,
    defaultRowSpan: 1,
  },
  {
    id: 'mainChart',
    title: 'Analiza Trendu',
    col: 1,
    row: 3,
    colSpan: 5,
    rowSpan: 2,
    minColSpan: 1,
    maxColSpan: GRID_TOTAL_COLS,
    minRowSpan: 1,
    maxRowSpan: 6,
    defaultCol: 1,
    defaultRow: 3,
    defaultColSpan: 5,
    defaultRowSpan: 2,
  },
  {
    id: 'bodyShape',
    title: 'Kształt i Skład Ciała',
    col: 6,
    row: 3,
    colSpan: 3,
    rowSpan: 2,
    minColSpan: 1,
    maxColSpan: GRID_TOTAL_COLS,
    minRowSpan: 1,
    maxRowSpan: 6,
    defaultCol: 6,
    defaultRow: 3,
    defaultColSpan: 3,
    defaultRowSpan: 2,
  },
  {
    id: 'history',
    title: 'Historia Pomiarów',
    col: 1,
    row: 5,
    colSpan: 8,
    rowSpan: 2,
    minColSpan: 1,
    maxColSpan: GRID_TOTAL_COLS,
    minRowSpan: 1,
    maxRowSpan: 6,
    defaultCol: 1,
    defaultRow: 5,
    defaultColSpan: 8,
    defaultRowSpan: 2,
  },
];

export const DEFAULT_MEASUREMENTS: MeasurementRecord[] = [
  {
    id: 'm1',
    date: '2026-08-30',
    time: '07:30',
    weight: 78.4,
    totalBodyWater: 59.2,
    overfat: 15.8,
    muscleMass: 40.2,
    boneMass: 3.4,
    bmi: 23.7,
    kcal: 1845,
    urineKetones: '0.5 mmol/L (Ślad)',
    ketoneValue: 0.5,
    ketoneLevel: 'trace',
    alcohol: 'none',
    diet: 'keto',
    notes: 'Pomiar na czczo po przebudzeniu',
  },
  {
    id: 'm2',
    date: '2026-08-29',
    time: '07:35',
    weight: 78.8,
    totalBodyWater: 58.7,
    overfat: 16.1,
    muscleMass: 40.1,
    boneMass: 3.4,
    bmi: 23.9,
    kcal: 1840,
    urineKetones: 'Negatywny (< 0.5 mmol/L)',
    ketoneValue: 0.1,
    ketoneLevel: 'negative',
    alcohol: 'light',
    diet: 'light',
  },
  {
    id: 'm3',
    date: '2026-08-28',
    time: '07:20',
    weight: 79.1,
    totalBodyWater: 58.4,
    overfat: 16.4,
    muscleMass: 39.9,
    boneMass: 3.4,
    bmi: 24.0,
    kcal: 1835,
    urineKetones: 'Negatywny (< 0.5 mmol/L)',
    ketoneValue: 0.1,
    ketoneLevel: 'negative',
    alcohol: 'none',
    diet: 'keto',
  },
  {
    id: 'm4',
    date: '2026-08-27',
    time: '07:40',
    weight: 79.5,
    totalBodyWater: 58.0,
    overfat: 16.7,
    muscleMass: 39.8,
    boneMass: 3.3,
    bmi: 24.1,
    kcal: 1830,
    urineKetones: 'Negatywny (< 0.5 mmol/L)',
    ketoneValue: 0.0,
    ketoneLevel: 'negative',
    alcohol: 'none',
    diet: 'light',
  },
  {
    id: 'm5',
    date: '2026-08-26',
    time: '07:25',
    weight: 79.7,
    totalBodyWater: 57.8,
    overfat: 16.9,
    muscleMass: 39.7,
    boneMass: 3.3,
    bmi: 24.2,
    kcal: 1828,
    urineKetones: '1.5 mmol/L (Lekka)',
    ketoneValue: 1.5,
    ketoneLevel: 'low',
    alcohol: 'heavy',
    diet: 'bad',
  },
  {
    id: 'm6',
    date: '2026-08-25',
    time: '07:15',
    weight: 80.1,
    totalBodyWater: 57.5,
    overfat: 17.2,
    muscleMass: 39.5,
    boneMass: 3.3,
    bmi: 24.3,
    kcal: 1825,
    urineKetones: 'Negatywny (< 0.5 mmol/L)',
    ketoneValue: 0.1,
    ketoneLevel: 'negative',
    alcohol: 'none',
    diet: 'keto',
  },
  {
    id: 'm7',
    date: '2026-08-24',
    time: '07:30',
    weight: 80.4,
    totalBodyWater: 57.2,
    overfat: 17.5,
    muscleMass: 39.4,
    boneMass: 3.3,
    bmi: 24.4,
    kcal: 1820,
    urineKetones: 'Negatywny (< 0.5 mmol/L)',
    ketoneValue: 0.0,
    ketoneLevel: 'negative',
    alcohol: 'none',
    diet: 'keto',
  },
];

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly dataDir = process.cwd().endsWith('backend')
    ? path.resolve(process.cwd(), 'data')
    : path.resolve(process.cwd(), 'backend', 'data');
  private readonly usersDir = path.join(this.dataDir, 'users');
  private readonly legacyLayoutFile = path.join(this.dataDir, 'layout.json');
  private readonly legacyMeasurementsFile = path.join(this.dataDir, 'measurements.json');

  async onModuleInit() {
    await this.initStorage();
  }

  private sanitizeUserId(userId?: string): string {
    if (!userId || userId.trim() === '' || userId === 'default' || userId === 'undefined' || userId === 'null') {
      return 'guest';
    }
    return userId.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  }

  private getUserDir(userId?: string): string {
    const safeId = this.sanitizeUserId(userId);
    return path.join(this.usersDir, safeId);
  }

  private getUserLayoutPath(userId?: string): string {
    return path.join(this.getUserDir(userId), 'layout.json');
  }

  private getUserMeasurementsPath(userId?: string): string {
    return path.join(this.getUserDir(userId), 'measurements.json');
  }

  private getUserProfilePath(userId?: string): string {
    return path.join(this.getUserDir(userId), 'user.json');
  }

  private async initStorage(): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await fs.mkdir(this.usersDir, { recursive: true });

      // Init default guest storage
      await this.ensureUserStorage('guest', {
        id: 'guest',
        name: 'Gość',
        email: 'guest@body-dashboard.local',
        provider: 'guest',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      });

      this.logger.log(`Storage per-user zainicjalizowany w: ${this.usersDir}`);
    } catch (err) {
      this.logger.error('Błąd podczas inicjalizacji katalogu storage:', err);
    }
  }

  async ensureUserStorage(userId: string, defaultUser?: Partial<UserDto>): Promise<void> {
    const userDir = this.getUserDir(userId);
    await fs.mkdir(userDir, { recursive: true });

    const layoutPath = this.getUserLayoutPath(userId);
    const measurementsPath = this.getUserMeasurementsPath(userId);
    const profilePath = this.getUserProfilePath(userId);

    // Profile init
    try {
      await fs.access(profilePath);
    } catch {
      const initialUser: UserDto = {
        id: userId,
        name: defaultUser?.name || 'Użytkownik',
        email: defaultUser?.email || `${userId}@body-dashboard.local`,
        picture: defaultUser?.picture,
        provider: defaultUser?.provider || 'guest',
        gender: defaultUser?.gender || 'male',
        createdAt: defaultUser?.createdAt || new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      await fs.writeFile(profilePath, JSON.stringify(initialUser, null, 2), 'utf-8');
    }

    // Layout init
    try {
      await fs.access(layoutPath);
    } catch {
      // Check legacy root layout
      let initialLayout = DEFAULT_WIDGETS;
      try {
        const legacyData = await fs.readFile(this.legacyLayoutFile, 'utf-8');
        const parsed = JSON.parse(legacyData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          initialLayout = parsed;
        }
      } catch {
        // use default
      }
      await fs.writeFile(layoutPath, JSON.stringify(initialLayout, null, 2), 'utf-8');
    }

    // Measurements init
    try {
      await fs.access(measurementsPath);
    } catch {
      const initialMeasurements: MeasurementRecord[] = (userId === 'guest') ? DEFAULT_MEASUREMENTS : [];
      await fs.writeFile(measurementsPath, JSON.stringify(initialMeasurements, null, 2), 'utf-8');
    }
  }

  // --- USER PROFILE METHODS ---

  async getUser(userId: string): Promise<UserDto | null> {
    try {
      const profilePath = this.getUserProfilePath(userId);
      const data = await fs.readFile(profilePath, 'utf-8');
      return JSON.parse(data) as UserDto;
    } catch {
      return null;
    }
  }

  async saveUser(user: UserDto): Promise<UserDto> {
    await this.ensureUserStorage(user.id, user);
    const profilePath = this.getUserProfilePath(user.id);
    await fs.writeFile(profilePath, JSON.stringify(user, null, 2), 'utf-8');
    return user;
  }

  async getAllUsers(): Promise<UserDto[]> {
    try {
      const entries = await fs.readdir(this.usersDir, { withFileTypes: true });
      const users: UserDto[] = [];
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const profilePath = path.join(this.usersDir, entry.name, 'user.json');
          try {
            const data = await fs.readFile(profilePath, 'utf-8');
            const user = JSON.parse(data) as UserDto;
            users.push(user);
          } catch {
            // ignore folders without valid profile
          }
        }
      }
      return users;
    } catch (err) {
      this.logger.warn('Błąd podczas pobierania listy użytkowników:', err);
      return [];
    }
  }

  // --- LAYOUT METHODS ---

  async getLayout(userId?: string): Promise<DashboardWidgetConfig[]> {
    const layoutPath = this.getUserLayoutPath(userId);
    try {
      const data = await fs.readFile(layoutPath, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (err) {
      this.logger.warn(`Nie udało się odczytać pliku ${layoutPath}, próbuję fallback:`, err);
    }
    return DEFAULT_WIDGETS;
  }

  async saveLayout(layout: DashboardWidgetConfig[], userId?: string): Promise<DashboardWidgetConfig[]> {
    const safeId = this.sanitizeUserId(userId);
    await this.ensureUserStorage(safeId);
    const layoutPath = this.getUserLayoutPath(safeId);
    await fs.writeFile(layoutPath, JSON.stringify(layout, null, 2), 'utf-8');
    this.logger.log(`Zapisano układ kafelków dla usera [${safeId}] w ${layoutPath}`);
    return layout;
  }

  async resetLayout(userId?: string): Promise<DashboardWidgetConfig[]> {
    return this.saveLayout(DEFAULT_WIDGETS, userId);
  }

  // --- MEASUREMENTS METHODS ---

  async getMeasurements(userId?: string): Promise<MeasurementRecord[]> {
    const measurementsPath = this.getUserMeasurementsPath(userId);
    try {
      const data = await fs.readFile(measurementsPath, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (err) {
      this.logger.warn(`Nie udało się odczytać pliku ${measurementsPath}, zwracam puste/domyślne:`, err);
    }
    return (!userId || userId === 'guest') ? DEFAULT_MEASUREMENTS : [];
  }

  async saveMeasurements(records: MeasurementRecord[], userId?: string): Promise<MeasurementRecord[]> {
    const safeId = this.sanitizeUserId(userId);
    await this.ensureUserStorage(safeId);
    const measurementsPath = this.getUserMeasurementsPath(safeId);
    await fs.writeFile(measurementsPath, JSON.stringify(records, null, 2), 'utf-8');
    this.logger.log(`Zapisano ${records.length} pomiarów dla usera [${safeId}] w ${measurementsPath}`);
    return records;
  }

  async resetMeasurements(userId?: string): Promise<MeasurementRecord[]> {
    const defaults = (!userId || userId === 'guest') ? DEFAULT_MEASUREMENTS : [];
    return this.saveMeasurements(defaults, userId);
  }
}
