import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { MeasurementsService } from './measurements.service';
import { DashboardLayoutService } from './dashboard-layout.service';
import { NotificationService } from './notification.service';
import { getApiBaseUrl } from './api.config';

export interface BackupExportOptions {
  measurements: boolean;
  layout: boolean;
  user: boolean;
}

export interface BackupPreview {
  version: number;
  app: string;
  exportedAt?: string;
  measurementsCount: number;
  layoutCount: number;
  userGender?: string;
  fileSizeText: string;
  fileName: string;
  rawPayload: any;
}

export interface BackupImportResponse {
  success: boolean;
  importedTypes: string[];
  measurementsCount: number;
  totalMeasurements: number;
  layoutCount: number;
  userUpdated: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class BackupService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly measurementsService = inject(MeasurementsService);
  private readonly layoutService = inject(DashboardLayoutService);
  private readonly notificationService = inject(NotificationService);

  private readonly apiUrl = `${getApiBaseUrl()}/api/backup`;

  readonly isExporting = signal<boolean>(false);
  readonly isImporting = signal<boolean>(false);
  readonly isClearing = signal<boolean>(false);

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'x-user-id': this.authService.currentUserId()
    });
  }

  /**
   * Eksportuje wybrane dane do pliku JSON i inicjuje pobieranie w przeglądarce.
   */
  async exportBackup(options: BackupExportOptions): Promise<boolean> {
    const selected: string[] = [];
    if (options.measurements) selected.push('measurements');
    if (options.layout) selected.push('layout');
    if (options.user) selected.push('user');

    if (selected.length === 0) {
      this.notificationService.showWarning('Wybierz co najmniej jeden rodzaj danych do wyeksportowania.');
      return false;
    }

    this.isExporting.set(true);
    try {
      const typesQuery = selected.join(',');
      const data = await firstValueFrom(
        this.http.get<any>(`${this.apiUrl}/export?types=${encodeURIComponent(typesQuery)}`, {
          headers: this.getHeaders()
        }).pipe(
          catchError(() => {
            // Fallback po stronie klienta w razie braku łączności
            const clientPayload: any = {
              version: 1,
              app: 'body-dashboard',
              exportedAt: new Date().toISOString(),
              userId: this.authService.currentUserId(),
              includedTypes: selected,
              data: {}
            };
            if (options.measurements) {
              clientPayload.data.measurements = this.measurementsService.history();
            }
            if (options.layout) {
              clientPayload.data.layout = this.layoutService.widgets();
            }
            if (options.user) {
              clientPayload.data.user = {
                gender: this.authService.userGender()
              };
            }
            return of(clientPayload);
          })
        )
      );

      if (!data || !data.data) {
        throw new Error('Otrzymano nieprawidłowe dane do eksportu.');
      }

      // Przygotowanie pliku do pobrania
      const jsonContent = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
      const filename = `body-dashboard-backup-${dateStr}.json`;

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      this.notificationService.showSuccess(`Pomyślnie wyeksportowano plik kopii: ${filename}`);
      return true;
    } catch (err: any) {
      this.notificationService.showError(`Błąd eksportu danych: ${err?.message || 'Nieznany błąd'}`);
      return false;
    } finally {
      this.isExporting.set(false);
    }
  }

  /**
   * Odczytuje i waliduje zawartość wybranego pliku JSON przed importem.
   */
  async parseBackupFile(file: File): Promise<BackupPreview> {
    const text = await file.text();
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('Wybrany plik nie jest poprawnym formatem JSON.');
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Zawartość pliku nie jest poprawnym obiektem JSON.');
    }

    const data = (parsed.data && typeof parsed.data === 'object') ? parsed.data : parsed;

    const measurements = Array.isArray(data.measurements) ? data.measurements : [];
    const layout = Array.isArray(data.layout) ? data.layout : [];
    const user = (data.user && typeof data.user === 'object') ? data.user : null;

    if (measurements.length === 0 && layout.length === 0 && !user) {
      throw new Error('Plik nie zawiera żadnych danych biometrii, układu ani profilu.');
    }

    const sizeKb = (file.size / 1024).toFixed(1);

    return {
      version: parsed.version || 1,
      app: parsed.app || 'body-dashboard',
      exportedAt: parsed.exportedAt,
      measurementsCount: measurements.length,
      layoutCount: layout.length,
      userGender: user?.gender,
      fileSizeText: `${sizeKb} KB`,
      fileName: file.name,
      rawPayload: parsed
    };
  }

  /**
   * Importuje dane kopii zapasowej do bazy danych i odświeża stan aplikacji.
   */
  async importBackup(payload: any): Promise<boolean> {
    this.isImporting.set(true);
    try {
      const response = await firstValueFrom(
        this.http.post<BackupImportResponse>(`${this.apiUrl}/import`, payload, {
          headers: this.getHeaders()
        }).pipe(
          catchError(err => {
            throw new Error(err?.error?.message || 'Błąd połączenia z serwerem podczas importu.');
          })
        )
      );

      // Aktualizacja stanu frontendu
      await Promise.all([
        this.measurementsService.loadFromBackend(),
        this.layoutService.loadFromBackend()
      ]);

      const data = (payload.data && typeof payload.data === 'object') ? payload.data : payload;
      if (data.user?.gender && (data.user.gender === 'male' || data.user.gender === 'female')) {
        this.authService.setGender(data.user.gender);
      }

      this.notificationService.showSuccess(
        `Import zakończony sukcesem! Zaimportowano: ${response.importedTypes.join(', ')} (${response.measurementsCount} pomiarów).`
      );
      return true;
    } catch (err: any) {
      this.notificationService.showError(`Błąd importu danych: ${err?.message || 'Wystąpił nieoczekiwany problem'}`);
      return false;
    } finally {
      this.isImporting.set(false);
    }
  }

  /**
   * Czyści historię pomiarów użytkownika.
   */
  async clearMeasurements(): Promise<boolean> {
    this.isClearing.set(true);
    try {
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/clear`, {}, {
          headers: this.getHeaders()
        }).pipe(
          catchError(err => {
            throw new Error(err?.error?.message || 'Nie udało się wyczyścić pomiarów.');
          })
        )
      );

      await this.measurementsService.loadFromBackend();
      this.notificationService.showInfo('Wszystkie wpisy pomiarów zostały wyczyszczone.');
      return true;
    } catch (err: any) {
      this.notificationService.showError(`Błąd podczas czyszczenia pomiarów: ${err?.message || 'Błąd serwera'}`);
      return false;
    } finally {
      this.isClearing.set(false);
    }
  }
}
