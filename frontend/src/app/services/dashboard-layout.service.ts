import { Injectable, signal, effect } from '@angular/core';

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

const STORAGE_KEY = 'body_dashboard_layout_v3';

@Injectable({
  providedIn: 'root'
})
export class DashboardLayoutService {
  readonly isEditMode = signal<boolean>(false);
  readonly widgets = signal<DashboardWidgetConfig[]>(this.loadInitialWidgets());

  constructor() {
    effect(() => {
      const currentWidgets = this.widgets();
      this.saveToStorage(currentWidgets);
    });
  }

  toggleEditMode(): void {
    this.isEditMode.update(v => !v);
  }

  setEditMode(enabled: boolean): void {
    this.isEditMode.set(enabled);
  }

  /**
   * Sprawdza czy dany prostokąt w siatce koliduje z innymi widgetami
   */
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

  /**
   * Przesuwa widget na konkretną pozycję (col, row) jeśli jest tam wolne miejsce
   */
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

  /**
   * Zmienia rozmiar widgetu (colSpan, rowSpan) tylko jeśli nie koliduje z sąsiadami
   */
  setWidgetSpanWithSpaceCheck(
    widgetId: string,
    colSpan: number,
    rowSpan: number
  ): void {
    const current = this.widgets().find(w => w.id === widgetId);
    if (!current) return;

    const clampedCol = Math.max(current.minColSpan, Math.min(GRID_TOTAL_COLS - current.col + 1, colSpan));
    const clampedRow = Math.max(current.minRowSpan, Math.min(current.maxRowSpan, rowSpan));

    // Sprawdź czy po powiększeniu mieści się w pustej przestrzeni
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

  resetToDefault(): void {
    this.widgets.set(
      DEFAULT_WIDGETS.map(w => ({
        ...w,
        col: w.defaultCol,
        row: w.defaultRow,
        colSpan: w.defaultColSpan,
        rowSpan: w.defaultRowSpan
      }))
    );
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  private loadInitialWidgets(): DashboardWidgetConfig[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {
      // ignore storage errors
    }
  }
}
