import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { MongoClient, type Db, type Collection } from 'mongodb';
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
export type DietType = 'keto' | 'low-carb' | 'low-carbon' | 'light' | 'bad';

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

interface MongoUserDoc extends UserDto {
  _id?: string;
  updatedAt?: string;
}

interface MongoLayoutDoc {
  _id?: string;
  userId: string;
  widgets: DashboardWidgetConfig[];
  updatedAt?: string;
}

interface MongoMeasurementsDoc {
  _id?: string;
  userId: string;
  records: MeasurementRecord[];
  updatedAt?: string;
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

function maskMongoUri(rawUri: string): string {
  try {
    return rawUri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)(@)/, '$1****$3');
  } catch {
    return 'mongodb://****';
  }
}

@Injectable()
export class StorageService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StorageService.name);
  private readonly dataDir = process.cwd().endsWith('backend')
    ? path.resolve(process.cwd(), 'data')
    : path.resolve(process.cwd(), 'backend', 'data');
  private readonly usersDir = path.join(this.dataDir, 'users');
  private readonly legacyLayoutFile = path.join(this.dataDir, 'layout.json');
  private readonly legacyMeasurementsFile = path.join(this.dataDir, 'measurements.json');

  // Klient MongoDB i kolekcje
  private mongoClient: MongoClient | null = null;
  private mongoDb: Db | null = null;
  private usersCollection: Collection<MongoUserDoc> | null = null;
  private layoutsCollection: Collection<MongoLayoutDoc> | null = null;
  private measurementsCollection: Collection<MongoMeasurementsDoc> | null = null;
  private isMongoConnected = false;
  private dbName = 'body_dashboard';
  private maskedUri = '';

  async onModuleInit() {
    await this.initStorage();
  }

  async onModuleDestroy() {
    if (this.mongoClient) {
      try {
        await this.mongoClient.close();
        this.logger.log('Zamknięto połączenie z bazą MongoDB.');
      } catch (err) {
        this.logger.warn('Błąd podczas zamykania połączenia z MongoDB:', err);
      }
    }
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
    // 1. Inicjalizacja lokalnego katalogu danych (zawsze gotowy jako fallback)
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await fs.mkdir(this.usersDir, { recursive: true });
    } catch (err) {
      this.logger.error('Błąd podczas tworzenia lokalnego katalogu storage:', err);
    }

    // 2. Próba połączenia z MongoDB jeśli zdefiniowano MONGODB_URI
    const rawUri = process.env.MONGODB_URI || process.env.MONGO_URI || '';
    if (rawUri.trim()) {
      this.maskedUri = maskMongoUri(rawUri);
      this.dbName = process.env.MONGODB_DB_NAME || 'body_dashboard';
      this.logger.log(`Wykryto MONGODB_URI. Inicjalizacja połączenia z MongoDB: ${this.maskedUri}...`);
      try {
        this.mongoClient = new MongoClient(rawUri, {
          serverSelectionTimeoutMS: 6000,
          connectTimeoutMS: 6000,
          maxPoolSize: 10,
        });
        await this.mongoClient.connect();
        this.mongoDb = this.mongoClient.db(this.dbName);

        // Ping testujący bazę
        await this.mongoDb.command({ ping: 1 });
        this.isMongoConnected = true;

        this.usersCollection = this.mongoDb.collection<MongoUserDoc>('users');
        this.layoutsCollection = this.mongoDb.collection<MongoLayoutDoc>('layouts');
        this.measurementsCollection = this.mongoDb.collection<MongoMeasurementsDoc>('measurements');

        // Indeksy gwarantujące unikalność i szybki odczyt
        await this.usersCollection.createIndex({ id: 1 }, { unique: true }).catch(() => {});
        await this.layoutsCollection.createIndex({ userId: 1 }, { unique: true }).catch(() => {});
        await this.measurementsCollection.createIndex({ userId: 1 }, { unique: true }).catch(() => {});

        this.logger.log(`Połączono pomyślnie z bazą MongoDB [${this.dbName}]! Dane są trwale zapisywane w chmurze.`);
      } catch (err: any) {
        this.isMongoConnected = false;
        this.logger.error(`Błąd połączenia z MongoDB (${this.maskedUri}): ${err?.message ?? err}. Następuje automatyczny powrót do lokalnego magazynu JSON.`);
      }
    } else {
      this.logger.log('Brak MONGODB_URI w środowisku. Aktywny lokalny magazyn JSON (backend/data/users/).');
    }

    // 3. Inicjalizacja magazynu domyślnego użytkownika 'guest'
    await this.ensureUserStorage('guest', {
      id: 'guest',
      name: 'Gość',
      email: 'guest@body-dashboard.local',
      provider: 'guest',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    });
  }

  async ensureUserStorage(userId: string, defaultUser?: Partial<UserDto>): Promise<void> {
    const safeId = this.sanitizeUserId(userId);

    // --- TRYB MONGODB ---
    if (this.isMongoConnected && this.usersCollection && this.layoutsCollection && this.measurementsCollection) {
      try {
        // 1. Profil użytkownika w MongoDB
        const existingUser = await this.usersCollection.findOne({ _id: safeId });
        if (!existingUser) {
          let migratedUser: UserDto | null = null;
          try {
            const profileData = await fs.readFile(this.getUserProfilePath(safeId), 'utf-8');
            migratedUser = JSON.parse(profileData);
          } catch {}

          const initialUser: MongoUserDoc = {
            id: safeId,
            name: migratedUser?.name || defaultUser?.name || (safeId === 'guest' ? 'Gość' : 'Użytkownik'),
            email: migratedUser?.email || defaultUser?.email || `${safeId}@body-dashboard.local`,
            picture: migratedUser?.picture || defaultUser?.picture,
            provider: migratedUser?.provider || defaultUser?.provider || (safeId === 'guest' ? 'guest' : 'google'),
            gender: migratedUser?.gender || defaultUser?.gender || 'male',
            createdAt: migratedUser?.createdAt || defaultUser?.createdAt || new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
            googleRawClaims: migratedUser?.googleRawClaims || defaultUser?.googleRawClaims,
            updatedAt: new Date().toISOString(),
          };
          await this.usersCollection.replaceOne({ _id: safeId }, initialUser, { upsert: true });
          if (migratedUser) {
            this.logger.log(`Zmigrowano profil usera [${safeId}] z lokalnego pliku JSON do MongoDB.`);
          }
        }

        // 2. Layout użytkownika w MongoDB
        const existingLayout = await this.layoutsCollection.findOne({ _id: safeId });
        if (!existingLayout) {
          let initialLayout = DEFAULT_WIDGETS;
          try {
            const layoutData = await fs.readFile(this.getUserLayoutPath(safeId), 'utf-8');
            const parsed = JSON.parse(layoutData);
            if (Array.isArray(parsed) && parsed.length > 0) {
              initialLayout = parsed;
              this.logger.log(`Zmigrowano układ kafelków dla [${safeId}] z lokalnego JSON do MongoDB.`);
            }
          } catch {}

          await this.layoutsCollection.replaceOne(
            { _id: safeId },
            { userId: safeId, widgets: initialLayout, updatedAt: new Date().toISOString() },
            { upsert: true }
          );
        }

        // 3. Pomiary biometrii w MongoDB
        const existingMeasurements = await this.measurementsCollection.findOne({ _id: safeId });
        if (!existingMeasurements) {
          let initialMeasurements: MeasurementRecord[] = (safeId === 'guest') ? DEFAULT_MEASUREMENTS : [];
          try {
            const measurementsData = await fs.readFile(this.getUserMeasurementsPath(safeId), 'utf-8');
            const parsed = JSON.parse(measurementsData);
            if (Array.isArray(parsed) && parsed.length > 0) {
              initialMeasurements = parsed;
              this.logger.log(`Zmigrowano ${parsed.length} pomiarów dla [${safeId}] z lokalnego JSON do MongoDB.`);
            }
          } catch {}

          await this.measurementsCollection.replaceOne(
            { _id: safeId },
            { userId: safeId, records: initialMeasurements, updatedAt: new Date().toISOString() },
            { upsert: true }
          );
        }
      } catch (err) {
        this.logger.error(`Błąd inicjalizacji magazynu MongoDB dla [${safeId}]:`, err);
      }
    }

    // --- TRYB LOKALNY PLIKÓW JSON (Zapewnia fallback) ---
    const userDir = this.getUserDir(safeId);
    await fs.mkdir(userDir, { recursive: true }).catch(() => {});

    const layoutPath = this.getUserLayoutPath(safeId);
    const measurementsPath = this.getUserMeasurementsPath(safeId);
    const profilePath = this.getUserProfilePath(safeId);

    // Profile init
    try {
      await fs.access(profilePath);
    } catch {
      const initialUser: UserDto = {
        id: safeId,
        name: defaultUser?.name || (safeId === 'guest' ? 'Gość' : 'Użytkownik'),
        email: defaultUser?.email || `${safeId}@body-dashboard.local`,
        picture: defaultUser?.picture,
        provider: defaultUser?.provider || (safeId === 'guest' ? 'guest' : 'google'),
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
      const initialMeasurements: MeasurementRecord[] = (safeId === 'guest') ? DEFAULT_MEASUREMENTS : [];
      await fs.writeFile(measurementsPath, JSON.stringify(initialMeasurements, null, 2), 'utf-8');
    }
  }

  // --- DIAGNOSTYKA STANU MAGAZYNU ---

  getStorageStatus(): {
    type: 'mongodb' | 'file-json';
    connected: boolean;
    database?: string;
    uriMasked?: string;
  } {
    return {
      type: this.isMongoConnected ? 'mongodb' : 'file-json',
      connected: this.isMongoConnected,
      database: this.isMongoConnected ? this.dbName : undefined,
      uriMasked: this.isMongoConnected ? this.maskedUri : undefined,
    };
  }

  // --- USER PROFILE METHODS ---

  async getUser(userId: string): Promise<UserDto | null> {
    const safeId = this.sanitizeUserId(userId);

    // Tryb MongoDB
    if (this.isMongoConnected && this.usersCollection) {
      try {
        const doc = await this.usersCollection.findOne({ _id: safeId });
        if (doc) {
          const { _id, updatedAt, ...rest } = doc;
          return { ...rest, id: rest.id || _id || safeId };
        }
        return null;
      } catch (err) {
        this.logger.warn(`Błąd odczytu profilu [${safeId}] z MongoDB, próba z pliku:`, err);
      }
    }

    // Fallback plikowy
    try {
      const profilePath = this.getUserProfilePath(safeId);
      const data = await fs.readFile(profilePath, 'utf-8');
      return JSON.parse(data) as UserDto;
    } catch {
      return null;
    }
  }

  async saveUser(user: UserDto): Promise<UserDto> {
    const safeId = this.sanitizeUserId(user.id);
    const sanitizedUser: UserDto = { ...user, id: safeId };

    // Tryb MongoDB
    if (this.isMongoConnected && this.usersCollection) {
      try {
        const doc: MongoUserDoc = {
          ...sanitizedUser,
          id: safeId,
          updatedAt: new Date().toISOString(),
        };
        await this.usersCollection.replaceOne({ _id: safeId }, doc, { upsert: true });
        this.logger.log(`Zapisano profil usera [${safeId}] w MongoDB`);
        return sanitizedUser;
      } catch (err) {
        this.logger.error(`Błąd zapisu profilu [${safeId}] w MongoDB:`, err);
      }
    }

    // Fallback plikowy
    await this.ensureUserStorage(safeId, sanitizedUser);
    const profilePath = this.getUserProfilePath(safeId);
    await fs.writeFile(profilePath, JSON.stringify(sanitizedUser, null, 2), 'utf-8');
    return sanitizedUser;
  }

  async getAllUsers(): Promise<UserDto[]> {
    // Tryb MongoDB
    if (this.isMongoConnected && this.usersCollection) {
      try {
        const docs = await this.usersCollection.find({}).toArray();
        return docs.map(doc => {
          const { _id, updatedAt, ...rest } = doc;
          return { ...rest, id: rest.id || _id || '' };
        });
      } catch (err) {
        this.logger.warn('Błąd pobierania listy użytkowników z MongoDB:', err);
      }
    }

    // Fallback plikowy
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
    const safeId = this.sanitizeUserId(userId);

    // Tryb MongoDB
    if (this.isMongoConnected && this.layoutsCollection) {
      try {
        const doc = await this.layoutsCollection.findOne({ _id: safeId });
        if (doc && Array.isArray(doc.widgets) && doc.widgets.length > 0) {
          return doc.widgets;
        }
        await this.ensureUserStorage(safeId);
        const refetched = await this.layoutsCollection.findOne({ _id: safeId });
        if (refetched && Array.isArray(refetched.widgets) && refetched.widgets.length > 0) {
          return refetched.widgets;
        }
      } catch (err) {
        this.logger.warn(`Błąd odczytu layoutu [${safeId}] z MongoDB, próba z pliku:`, err);
      }
    }

    // Fallback plikowy
    const layoutPath = this.getUserLayoutPath(safeId);
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

    // Tryb MongoDB
    if (this.isMongoConnected && this.layoutsCollection) {
      try {
        const doc: MongoLayoutDoc = {
          userId: safeId,
          widgets: layout,
          updatedAt: new Date().toISOString(),
        };
        await this.layoutsCollection.replaceOne({ _id: safeId }, doc, { upsert: true });
        this.logger.log(`Zapisano układ kafelków dla usera [${safeId}] w MongoDB`);
        return layout;
      } catch (err) {
        this.logger.error(`Błąd zapisu layoutu w MongoDB:`, err);
      }
    }

    // Fallback plikowy
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
    const safeId = this.sanitizeUserId(userId);

    // Tryb MongoDB
    if (this.isMongoConnected && this.measurementsCollection) {
      try {
        const doc = await this.measurementsCollection.findOne({ _id: safeId });
        if (doc && Array.isArray(doc.records)) {
          return doc.records;
        }
        await this.ensureUserStorage(safeId);
        const refetched = await this.measurementsCollection.findOne({ _id: safeId });
        if (refetched && Array.isArray(refetched.records)) {
          return refetched.records;
        }
      } catch (err) {
        this.logger.warn(`Błąd odczytu pomiarów [${safeId}] z MongoDB, próba z pliku:`, err);
      }
    }

    // Fallback plikowy
    const measurementsPath = this.getUserMeasurementsPath(safeId);
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

    // Tryb MongoDB
    if (this.isMongoConnected && this.measurementsCollection) {
      try {
        const doc: MongoMeasurementsDoc = {
          userId: safeId,
          records: records,
          updatedAt: new Date().toISOString(),
        };
        await this.measurementsCollection.replaceOne({ _id: safeId }, doc, { upsert: true });
        this.logger.log(`Zapisano ${records.length} pomiarów dla usera [${safeId}] w MongoDB`);
        return records;
      } catch (err) {
        this.logger.error(`Błąd zapisu pomiarów w MongoDB:`, err);
      }
    }

    // Fallback plikowy
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

  async clearMeasurements(userId?: string): Promise<MeasurementRecord[]> {
    return this.saveMeasurements([], userId);
  }
}

