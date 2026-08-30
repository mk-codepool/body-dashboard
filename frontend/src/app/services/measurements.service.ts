import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

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
    ketoneLevel: 'negative'
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
    ketoneLevel: 'negative'
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
    ketoneLevel: 'negative'
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
    ketoneLevel: 'low'
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
    ketoneLevel: 'negative'
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
    ketoneLevel: 'negative'
  }
];

@Injectable({
  providedIn: 'root'
})
export class MeasurementsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/api/measurements';

  readonly history = signal<MeasurementRecord[]>(DEFAULT_MEASUREMENTS);
  readonly isLoading = signal<boolean>(false);
  readonly isSyncing = signal<boolean>(false);

  constructor() {
    this.loadFromBackend();
  }

  async loadFromBackend(): Promise<void> {
    this.isLoading.set(true);
    try {
      const records = await firstValueFrom(
        this.http.get<MeasurementRecord[]>(this.apiUrl).pipe(
          catchError(() => of(DEFAULT_MEASUREMENTS))
        )
      );
      if (Array.isArray(records)) {
        this.history.set(records);
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
        this.http.post<MeasurementRecord>(this.apiUrl, record).pipe(
          catchError(() => of({ ...record, id: record.id || `local_${Date.now()}` } as MeasurementRecord))
        )
      );
      this.history.update(list => [saved, ...list]);
      return saved;
    } finally {
      this.isSyncing.set(false);
    }
  }

  async updateMeasurement(id: string, updateData: Partial<MeasurementRecord>): Promise<void> {
    this.isSyncing.set(true);
    try {
      const updated = await firstValueFrom(
        this.http.put<MeasurementRecord>(`${this.apiUrl}/${id}`, updateData).pipe(
          catchError(() => of(null))
        )
      );
      this.history.update(list => list.map(m => (m.id === id ? { ...m, ...(updated || updateData) } : m)));
    } finally {
      this.isSyncing.set(false);
    }
  }

  async deleteMeasurement(id: string): Promise<void> {
    this.isSyncing.set(true);
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/${id}`).pipe(
          catchError(() => of(null))
        )
      );
      this.history.update(list => list.filter(m => m.id !== id));
    } finally {
      this.isSyncing.set(false);
    }
  }

  async resetToDefault(): Promise<void> {
    this.isSyncing.set(true);
    try {
      const defaults = await firstValueFrom(
        this.http.post<MeasurementRecord[]>(`${this.apiUrl}/reset`, {}).pipe(
          catchError(() => of(DEFAULT_MEASUREMENTS))
        )
      );
      this.history.set(defaults);
    } finally {
      this.isSyncing.set(false);
    }
  }
}
