import { Injectable, signal, effect, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { getApiBaseUrl } from './api.config';

export interface DashboardWidgetConfig {
  id: string;
  title: string;
  col: number;      // 1-indexed column start
  row: number;      // 1-indexed row start
  colSpan: number;  // column span (width)
  rowSpan: number;  // row span (height)
  minColSpan: number;
  maxColSpan: number;
  minRowSpan: number;
  maxRowSpan: number;
  defaultCol: number;
  defaultRow: number;
  defaultColSpan: number;
  defaultRowSpan: number;
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
    defaultRowSpan: 1
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
    defaultRowSpan: 1
  },
  {
    id: 'tbw',
    title: 'Nawodnienie komórkowe',
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
    defaultRowSpan: 2
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
    defaultRowSpan: 1
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
    defaultRowSpan: 1
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
    defaultRowSpan: 1
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
    defaultRowSpan: 1
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
    defaultRowSpan: 1
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
    defaultRowSpan: 1
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
    defaultRowSpan: 1
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
    defaultRowSpan: 1
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
    defaultRowSpan: 2
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
    defaultRowSpan: 2
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
    defaultRowSpan: 2
  }
];

@Injectable({
  providedIn: 'root'
})
export class DashboardLayoutService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = `${getApiBaseUrl()}/api/layout`;

  readonly isEditMode = signal<boolean>(false);
  readonly widgets = signal<DashboardWidgetConfig[]>(this.loadInitialWidgets());
  readonly isSyncing = signal<boolean>(false);

  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.loadFromBackend();

    // Auto reload when user switches
    effect(() => {
      const userId = this.authService.currentUserId();
      if (userId) {
        this.loadFromBackend();
      }
    });

    effect(() => {
      const currentWidgets = this.widgets();
      this.saveToStorage(currentWidgets);
      this.scheduleBackendSync(currentWidgets);
    });
  }

  private getStorageKey(): string {
    return `body_dashboard_layout_v4_${this.authService.currentUserId()}`;
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'x-user-id': this.authService.currentUserId()
    });
  }

  async loadFromBackend(): Promise<void> {
    try {
      const remoteWidgets = await firstValueFrom(
        this.http.get<DashboardWidgetConfig[]>(this.apiUrl, { headers: this.getHeaders() }).pipe(
          catchError(() => of(null))
        )
      );
      if (Array.isArray(remoteWidgets) && remoteWidgets.length > 0) {
        this.widgets.set(remoteWidgets);
        this.saveToStorage(remoteWidgets);
      }
    } catch {
      // ignore
    }
  }

  private scheduleBackendSync(widgets: DashboardWidgetConfig[]): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(async () => {
      try {
        this.isSyncing.set(true);
        await firstValueFrom(
          this.http.put<DashboardWidgetConfig[]>(this.apiUrl, widgets, { headers: this.getHeaders() }).pipe(
            catchError(() => of(null))
          )
        );
      } finally {
        this.isSyncing.set(false);
      }
    }, 400);
  }

  toggleEditMode(): void {
    this.isEditMode.update(v => !v);
  }

  setEditMode(enabled: boolean): void {
    this.isEditMode.set(enabled);
  }

  canPlaceWidget(
    widgetId: string,
    targetCol: number,
    targetRow: number,
    colSpan: number,
    rowSpan: number
  ): boolean {
    if (targetCol < 1 || targetCol + colSpan - 1 > GRID_TOTAL_COLS) return false;
    if (targetRow < 1) return false;

    const others = this.widgets().filter(w => w.id !== widgetId);
    for (const other of others) {
      const overlapX = targetCol < other.col + other.colSpan && targetCol + colSpan > other.col;
      const overlapY = targetRow < other.row + other.rowSpan && targetRow + rowSpan > other.row;
      if (overlapX && overlapY) {
        return false;
      }
    }
    return true;
  }

  setWidgetPosition(widgetId: string, col: number, row: number): boolean {
    const current = this.widgets().find(w => w.id === widgetId);
    if (!current) return false;

    if (!this.canPlaceWidget(widgetId, col, row, current.colSpan, current.rowSpan)) {
      return false;
    }

    this.widgets.update(list =>
      list.map(w => (w.id === widgetId ? { ...w, col, row } : w))
    );
    return true;
  }

  setWidgetSpanWithSpaceCheck(
    widgetId: string,
    colSpan: number,
    rowSpan: number
  ): void {
    const current = this.widgets().find(w => w.id === widgetId);
    if (!current) return;

    const clampedCol = Math.max(current.minColSpan, Math.min(GRID_TOTAL_COLS - current.col + 1, colSpan));
    const clampedRow = Math.max(current.minRowSpan, Math.min(current.maxRowSpan, rowSpan));

    if (this.canPlaceWidget(widgetId, current.col, current.row, clampedCol, clampedRow)) {
      this.widgets.update(list =>
        list.map(w =>
          w.id === widgetId
            ? { ...w, colSpan: clampedCol, rowSpan: clampedRow }
            : w
        )
      );
    }
  }

  async resetToDefault(): Promise<void> {
    const defaults = DEFAULT_WIDGETS.map(w => ({
      ...w,
      col: w.defaultCol,
      row: w.defaultRow,
      colSpan: w.defaultColSpan,
      rowSpan: w.defaultRowSpan
    }));

    this.widgets.set(defaults);
    try {
      localStorage.removeItem(this.getStorageKey());
    } catch {
      // ignore
    }

    try {
      this.isSyncing.set(true);
      await firstValueFrom(
        this.http.post<DashboardWidgetConfig[]>(`${this.apiUrl}/reset`, {}, { headers: this.getHeaders() }).pipe(
          catchError(() => of(null))
        )
      );
    } finally {
      this.isSyncing.set(false);
    }
  }

  private loadInitialWidgets(): DashboardWidgetConfig[] {
    try {
      const stored = localStorage.getItem(this.getStorageKey());
      if (stored) {
        const parsed = JSON.parse(stored) as Array<Partial<DashboardWidgetConfig> & { id: string }>;
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map = new Map(DEFAULT_WIDGETS.map(w => [w.id, w]));
          const restored: DashboardWidgetConfig[] = [];

          for (const item of parsed) {
            const def = map.get(item.id);
            if (def) {
              const col = Math.max(1, Math.min(GRID_TOTAL_COLS, item.col ?? def.defaultCol));
              const row = Math.max(1, item.row ?? def.defaultRow);
              const colSpan = Math.max(1, Math.min(GRID_TOTAL_COLS - col + 1, item.colSpan ?? def.defaultColSpan));
              const rowSpan = Math.max(1, Math.min(def.maxRowSpan, item.rowSpan ?? def.defaultRowSpan));

              restored.push({
                ...def,
                col,
                row,
                colSpan,
                rowSpan
              });
              map.delete(item.id);
            }
          }

          for (const remaining of map.values()) {
            restored.push({ ...remaining });
          }

          return restored;
        }
      }
    } catch {
      // ignore storage errors
    }

    return DEFAULT_WIDGETS.map(w => ({ ...w }));
  }

  private saveToStorage(widgets: DashboardWidgetConfig[]): void {
    try {
      const toSave = widgets.map(w => ({
        id: w.id,
        col: w.col,
        row: w.row,
        colSpan: w.colSpan,
        rowSpan: w.rowSpan
      }));
      localStorage.setItem(this.getStorageKey(), JSON.stringify(toSave));
    } catch {
      // ignore storage errors
    }
  }
}
