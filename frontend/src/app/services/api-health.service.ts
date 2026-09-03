import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { getApiBaseUrl } from './api.config';

export type ServerHealthStatus = 'online' | 'waking_up' | 'offline' | 'checking';

export interface StorageHealthInfo {
  type: 'mongodb' | 'file-json';
  connected: boolean;
  database?: string;
  uriMasked?: string;
}

export interface HealthResponseDto {
  status: string;
  service: string;
  timestamp: string;
  uptimeSeconds: number;
  version: string;
  storage?: StorageHealthInfo;
}

@Injectable({
  providedIn: 'root'
})
export class ApiHealthService {
  private readonly http = inject(HttpClient);
  private readonly healthUrl = `${getApiBaseUrl()}/api/health`;

  readonly status = signal<ServerHealthStatus>('checking');
  readonly latencyMs = signal<number | null>(null);
  readonly storageInfo = signal<StorageHealthInfo | null>(null);
  readonly uptimeSeconds = signal<number>(0);
  readonly lastChecked = signal<Date | null>(null);
  readonly isChecking = signal<boolean>(false);

  readonly isOnline = computed(() => this.status() === 'online');
  readonly isWakingUp = computed(() => this.status() === 'waking_up');
  readonly isOffline = computed(() => this.status() === 'offline');

  readonly statusBadgeText = computed(() => {
    switch (this.status()) {
      case 'online':
        return 'ONLINE';
      case 'waking_up':
        return 'WYBUDZANIE SERWERA';
      case 'offline':
        return 'OFFLINE';
      case 'checking':
      default:
        return 'SPRAWDZANIE';
    }
  });

  readonly statusDescription = computed(() => {
    switch (this.status()) {
      case 'online': {
        const ms = this.latencyMs();
        const latencyText = ms !== null ? ` (czas: ${ms} ms)` : '';
        const storageType = this.storageInfo()?.type === 'mongodb' ? 'MongoDB Atlas' : 'Lokalny JSON';
        return `Serwer w chmurze jest aktywny${latencyText}. Magazyn: ${storageType}.`;
      }
      case 'waking_up':
        return 'Trwa wybudzanie kontenera backendu (Render cold-start: ok. 50s). Dane są wczytywane z pamięci lokalnej urządzenia (0 ms).';
      case 'offline':
        return 'Brak połączenia z backendem. Aplikacja działa w trybie autonomicznym z pamięcią podręczną offline.';
      case 'checking':
      default:
        return 'Nawiązywanie połączenia z serwerem...';
    }
  });

  private keepAliveInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // 1. Wyprzedzający rozruch (Pre-warming): ping w momencie uruchomienia aplikacji
    this.checkHealth();

    // 2. Cykliczny Keep-Alive co 10 minut w celu zapobieżenia uśpieniu na Renderze
    if (typeof window !== 'undefined') {
      this.keepAliveInterval = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState !== 'hidden') {
          this.checkHealth(false);
        }
      }, 10 * 60 * 1000);

      // Reakcja na powrót użytkownika do karty po dłuższej nieobecności
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          const last = this.lastChecked();
          // Jeśli minęło ponad 5 minut od ostatniego sprawdzenia, odśwież natychmiast
          if (!last || Date.now() - last.getTime() > 5 * 60 * 1000) {
            this.checkHealth(false);
          }
        }
      });
    }
  }

  /**
   * Sprawdzenie stanu zdrowia backendu z pomiarem czasu odpowiedzi i detekcją wybudzania
   */
  async checkHealth(manual = true): Promise<boolean> {
    if (manual) {
      this.isChecking.set(true);
    }

    const startTime = Date.now();

    // Jeśli po 2.2 sekundy nadal brak odpowiedzi, ustawiamy stan "wybudzanie serwera"
    const wakingUpTimeout = setTimeout(() => {
      if (this.status() !== 'online') {
        this.status.set('waking_up');
      }
    }, 2200);

    try {
      const response = await firstValueFrom(
        this.http.get<HealthResponseDto>(this.healthUrl).pipe(
          catchError(() => of(null))
        )
      );

      clearTimeout(wakingUpTimeout);
      const latency = Date.now() - startTime;

      if (response && response.status === 'ok') {
        this.status.set('online');
        this.latencyMs.set(latency);
        this.storageInfo.set(response.storage || null);
        this.uptimeSeconds.set(response.uptimeSeconds || 0);
        this.lastChecked.set(new Date());
        return true;
      } else {
        // Jeśli nie ma odpowiedzi: sprawdź czy to brak internetu
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          this.status.set('offline');
        } else {
          // Serwer może być w trakcie startu lub zresetowany
          this.status.set('waking_up');
        }
        this.lastChecked.set(new Date());
        return false;
      }
    } catch {
      clearTimeout(wakingUpTimeout);
      this.status.set(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'waking_up');
      this.lastChecked.set(new Date());
      return false;
    } finally {
      this.isChecking.set(false);
    }
  }
}
