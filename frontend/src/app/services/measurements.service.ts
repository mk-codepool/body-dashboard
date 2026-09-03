import { Injectable, inject, signal, effect } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { getApiBaseUrl } from './api.config';

export type AlcoholLevel = 'none' | 'light' | 'heavy';
export type DietType = 'keto' | 'low-carb' | 'low-carbon' | 'light' | 'bad';

export interface MeasurementRecord {
  id: string;
  date: string;
  time: string;
  weight: number; // kg
  totalBodyWater: number; // %
  overfat: number; // %
  muscleMass: number; // %
  boneMass: number; // %
  bmi: number;
  kcal: number;
  urineKetones: string;
  ketoneValue: number;
  ketoneLevel?: 'none' | 'negative' | 'trace' | 'low' | 'moderate' | 'high';
  alcohol?: AlcoholLevel;
  diet?: DietType;
  notes?: string;
}

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
    notes: 'Pomiar na czczo po przebudzeniu'
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
    diet: 'light'
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
    diet: 'keto'
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
    diet: 'light'
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
    diet: 'bad'
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
    diet: 'keto'
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
    diet: 'keto'
  }
];

@Injectable({
  providedIn: 'root'
})
export class MeasurementsService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = `${getApiBaseUrl()}/api/measurements`;

  // Natychmiastowe ładowanie z pamięci lokalnej (0 ms)
  readonly history = signal<MeasurementRecord[]>(this.loadStoredMeasurements());
  readonly isLoading = signal<boolean>(false);
  readonly isSyncing = signal<boolean>(false);
  readonly isModalOpen = signal<boolean>(false);

  openModal(): void {
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  constructor() {
    // Automatyczna reakcja na przełączenie użytkownika
    effect(() => {
      const userId = this.authService.currentUserId();
      // 1. Błyskawiczny odczyt danych danego użytkownika z localStorage
      const cached = this.loadStoredMeasurements(userId);
      this.history.set(cached);

      // 2. Pobranie najnowszych danych z backendu w tle
      this.loadFromBackend();
    });
  }

  private getStorageKey(userId?: string): string {
    const id = userId || this.authService.currentUserId();
    return `body_dashboard_measurements_v1_${id}`;
  }

  private loadStoredMeasurements(userId?: string): MeasurementRecord[] {
    if (typeof localStorage === 'undefined') {
      return (userId || this.authService.currentUserId()) === 'guest' ? DEFAULT_MEASUREMENTS : [];
    }
    const key = this.getStorageKey(userId);
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    const currentId = userId || this.authService.currentUserId();
    return currentId === 'guest' ? DEFAULT_MEASUREMENTS : [];
  }

  private saveToStorage(records: MeasurementRecord[], userId?: string): void {
    if (typeof localStorage === 'undefined') return;
    const key = this.getStorageKey(userId);
    try {
      localStorage.setItem(key, JSON.stringify(records));
    } catch {
      // ignore
    }
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'x-user-id': this.authService.currentUserId()
    });
  }

  async loadFromBackend(): Promise<void> {
    this.isLoading.set(true);
    const userId = this.authService.currentUserId();
    try {
      const fallback = this.loadStoredMeasurements(userId);
      const records = await firstValueFrom(
        this.http.get<MeasurementRecord[]>(this.apiUrl, { headers: this.getHeaders() }).pipe(
          retry({ count: 3, delay: 2500 }),
          catchError(() => of(fallback))
        )
      );
      if (Array.isArray(records)) {
        this.history.set(records);
        this.saveToStorage(records, userId);
      }
    } catch {
      // ignore
    } finally {
      this.isLoading.set(false);
    }
  }

  async addMeasurement(record: Omit<MeasurementRecord, 'id'> & { id?: string }): Promise<MeasurementRecord | null> {
    this.isSyncing.set(true);
    try {
      const saved = await firstValueFrom(
        this.http.post<MeasurementRecord>(this.apiUrl, record, { headers: this.getHeaders() }).pipe(
          catchError(() => of({ ...record, id: record.id || `local_${Date.now()}` } as MeasurementRecord))
        )
      );
      this.history.update(list => {
        const updated = [saved, ...list];
        this.saveToStorage(updated);
        return updated;
      });
      return saved;
    } finally {
      this.isSyncing.set(false);
    }
  }

  async updateMeasurement(id: string, updateData: Partial<MeasurementRecord>): Promise<void> {
    this.isSyncing.set(true);
    try {
      const updated = await firstValueFrom(
        this.http.put<MeasurementRecord>(`${this.apiUrl}/${id}`, updateData, { headers: this.getHeaders() }).pipe(
          catchError(() => of(null))
        )
      );
      this.history.update(list => {
        const next = list.map(m => (m.id === id ? { ...m, ...(updated || updateData) } : m));
        this.saveToStorage(next);
        return next;
      });
    } finally {
      this.isSyncing.set(false);
    }
  }

  async deleteMeasurement(id: string): Promise<void> {
    this.isSyncing.set(true);
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() }).pipe(
          catchError(() => of(null))
        )
      );
      this.history.update(list => {
        const next = list.filter(m => m.id !== id);
        this.saveToStorage(next);
        return next;
      });
    } finally {
      this.isSyncing.set(false);
    }
  }

  async resetToDefault(): Promise<void> {
    this.isSyncing.set(true);
    try {
      const fallback = (this.authService.currentUserId() === 'guest') ? DEFAULT_MEASUREMENTS : [];
      const defaults = await firstValueFrom(
        this.http.post<MeasurementRecord[]>(`${this.apiUrl}/reset`, {}, { headers: this.getHeaders() }).pipe(
          catchError(() => of(fallback))
        )
      );
      const toSet = Array.isArray(defaults) ? defaults : fallback;
      this.history.set(toSet);
      this.saveToStorage(toSet);
    } finally {
      this.isSyncing.set(false);
    }
  }
}

