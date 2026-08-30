import { Component, signal, computed, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardLayoutService, DashboardWidgetConfig } from '../services/dashboard-layout.service';

export interface MeasurementRecord {
  id: string;
  date: string;
  time: string;
  weight: number; // kg
  totalBodyWater: number; // %
  overfat: number; // %
  muscleMass: number; // kg
  boneMass: number; // kg
  bmi: number;
  kcal: number; // BMR
  urineKetones: string;
  ketoneValue: number; // mmol/L do wykresu
  ketoneLevel: 'negative' | 'trace' | 'low' | 'moderate' | 'high';
  notes?: string;
}

export type ChartParamKey = 
  | 'weight' 
  | 'totalBodyWater' 
  | 'overfat' 
  | 'muscleMass' 
  | 'boneMass' 
  | 'bmi' 
  | 'kcal' 
  | 'ketoneValue';

export interface ParamMeta {
  key: ChartParamKey;
  label: string;
  unit: string;
  color: string;
  gradientId: string;
  minGuide?: number;
  maxGuide?: number;
}

export interface ChartPoint {
  x: number;
  y: number;
  val: number;
  date: string;
  formatted: string;
}

export interface BodyCompartmentItem {
  id: string;
  label: string;
  percent: number;
  kg: number;
  color: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent {
  readonly layoutService = inject(DashboardLayoutService);

  // Metadane wszystkich mierzonych parametrów
  readonly paramList: ParamMeta[] = [
    { key: 'weight', label: 'Waga', unit: 'kg', color: '#06b6d4', gradientId: 'grad-weight' },
    { key: 'totalBodyWater', label: 'Total Body Water', unit: '%', color: '#3b82f6', gradientId: 'grad-tbw' },
    { key: 'overfat', label: 'Overfat (Tłuszcz)', unit: '%', color: '#f59e0b', gradientId: 'grad-fat' },
    { key: 'muscleMass', label: 'Mięśnie', unit: 'kg', color: '#10b981', gradientId: 'grad-muscle' },
    { key: 'boneMass', label: 'Kości', unit: 'kg', color: '#a855f7', gradientId: 'grad-bones' },
    { key: 'bmi', label: 'BMI', unit: '', color: '#0ea5e9', gradientId: 'grad-bmi' },
    { key: 'kcal', label: 'Kcal (BMR)', unit: 'kcal', color: '#f97316', gradientId: 'grad-kcal' },
    { key: 'ketoneValue', label: 'Ketony w moczu', unit: 'mmol/L', color: '#ec4899', gradientId: 'grad-ketones' }
  ];

  // Aktywny parametr w głównym panelu wykresów
  readonly activeParamKey = signal<ChartParamKey>('weight');

  // Bogaty zestaw ostatnich 7 pomiarów (posortowanych chronologicznie od najstarszego do najnowszego dla wykresów)
  readonly history = signal<MeasurementRecord[]>([
    {
      id: 'm1',
      date: '2026-08-30',
      time: '07:30',
      weight: 78.4,
      totalBodyWater: 59.2,
      overfat: 15.8,
      muscleMass: 62.5,
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
      muscleMass: 62.3,
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
      muscleMass: 62.1,
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
      muscleMass: 61.9,
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
      muscleMass: 61.8,
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
      muscleMass: 61.6,
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
      muscleMass: 61.5,
      boneMass: 3.3,
      bmi: 24.4,
      kcal: 1820,
      urineKetones: 'Negatywny (< 0.5 mmol/L)',
      ketoneValue: 0.0,
      ketoneLevel: 'negative'
    }
  ]);

  // Indeks aktywnego rekordu wybranego na kafelkach
  readonly selectedIndex = signal<number>(0);

  // Aktywny rekord
  readonly current = computed(() => this.history()[this.selectedIndex()] || this.history()[0]);

  // Poprzedni pomiar
  readonly previous = computed(() => this.history()[this.selectedIndex() + 1]);

  // Obliczenia różnic / trendów
  readonly weightDelta = computed(() => {
    const prev = this.previous();
    if (!prev) return null;
    const diff = this.current().weight - prev.weight;
    return Math.round(diff * 10) / 10;
  });

  readonly waterLiters = computed(() => {
    const m = this.current();
    return Math.round((m.weight * (m.totalBodyWater / 100)) * 10) / 10;
  });

  readonly musclePercent = computed(() => {
    const m = this.current();
    return Math.round((m.muscleMass / m.weight) * 1000) / 10;
  });

  // Skład ciała w podziale 4-kompartmentowym (Woda, Tłuszcz, Białko/Mięśnie, Minerały kości)
  readonly bodyComposition = computed<BodyCompartmentItem[]>(() => {
    const m = this.current();
    const w = m.weight;
    const waterPct = m.totalBodyWater;
    const waterKg = Math.round((w * (waterPct / 100)) * 10) / 10;

    const fatPct = m.overfat;
    const fatKg = Math.round((w * (fatPct / 100)) * 10) / 10;

    const boneKg = m.boneMass;
    const bonePct = Math.round((boneKg / w) * 1000) / 10;

    const leanDryKg = Math.max(0, Math.round((w - waterKg - fatKg - boneKg) * 10) / 10);
    const leanDryPct = Math.max(0, Math.round((100 - waterPct - fatPct - bonePct) * 10) / 10);

    return [
      { id: 'water', label: 'Woda (TBW)', percent: waterPct, kg: waterKg, color: '#3b82f6' },
      { id: 'muscle', label: 'Mięśnie & Białko', percent: leanDryPct, kg: leanDryKg, color: '#10b981' },
      { id: 'fat', label: 'Tłuszcz (Fat)', percent: fatPct, kg: fatKg, color: '#f59e0b' },
      { id: 'bones', label: 'Kości (Minerały)', percent: bonePct, kg: boneKg, color: '#a855f7' }
    ];
  });


  // Dane posortowane chronologicznie do renderowania wykresów (od najstarszego do najnowszego)
  readonly chronologicalHistory = computed(() => {
    return [...this.history()].reverse();
  });

  // Metadane aktywnego parametru na wykresie głównym
  readonly activeParamMeta = computed(() => {
    return this.paramList.find(p => p.key === this.activeParamKey()) || this.paramList[0];
  });

  // Obliczanie wektorów głównego wykresu SVG
  readonly mainChartData = computed(() => {
    const records = this.chronologicalHistory();
    const key = this.activeParamKey();
    const meta = this.activeParamMeta();
    const width = 640;
    const height = 180;
    const padding = { top: 25, right: 35, bottom: 25, left: 35 };

    const values = records.map(r => Number(r[key]));
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = (maxVal - minVal) === 0 ? 1 : (maxVal - minVal);
    const plotHeight = height - padding.top - padding.bottom;
    const plotWidth = width - padding.left - padding.right;

    const points: ChartPoint[] = records.map((r, i) => {
      const val = Number(r[key]);
      const x = padding.left + (i / (records.length - 1)) * plotWidth;
      const y = height - padding.bottom - ((val - minVal) / range) * plotHeight;
      return {
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        val,
        date: r.date.substring(5), // np. "08-30"
        formatted: `${val} ${meta.unit}`
      };
    });

    // Płynna linia SVG
    let linePath = '';
    if (points.length > 0) {
      linePath = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        const p0 = points[i - 1];
        const p1 = points[i];
        const cx = (p0.x + p1.x) / 2;
        linePath += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
      }
    }

    // Zamknięty obszar gradientu pod wykresem
    const areaPath = linePath
      ? `${linePath} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`
      : '';

    return {
      width,
      height,
      points,
      linePath,
      areaPath,
      minVal,
      maxVal,
      delta: Math.round((values[values.length - 1] - values[0]) * 10) / 10
    };
  });

  // Generator małych wykresów typu Sparkline dla pojedynczych kafelków
  getSparkline(key: ChartParamKey, width = 100, height = 32): { line: string; area: string } {
    const records = this.chronologicalHistory();
    const values = records.map(r => Number(r[key]));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = (max - min) === 0 ? 1 : (max - min);
    const pad = 4;
    const plotH = height - pad * 2;
    const plotW = width - pad * 2;

    const pts = records.map((r, i) => {
      const val = Number(r[key]);
      const x = pad + (i / (records.length - 1)) * plotW;
      const y = height - pad - ((val - min) / range) * plotH;
      return { x: Math.round(x), y: Math.round(y) };
    });

    if (pts.length === 0) return { line: '', area: '' };

    let line = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const cx = (p0.x + p1.x) / 2;
      line += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    const area = `${line} L ${pts[pts.length - 1].x} ${height} L ${pts[0].x} ${height} Z`;
    return { line, area };
  }

  setChartParam(key: ChartParamKey): void {
    this.activeParamKey.set(key);
  }

  selectMeasurement(index: number): void {
    this.selectedIndex.set(index);
  }

  // Blueprint Grid - kafelki podkładowe dla siatki (8 kolumn x 10 wierszy)
  readonly blueprintGridTiles = Array.from({ length: 8 * 10 }, (_, i) => ({
    col: (i % 8) + 1,
    row: Math.floor(i / 8) + 1
  }));

  // Stan dla uniesionego kafelka (Drag & Drop)
  readonly activeDragWidget = signal<DashboardWidgetConfig | null>(null);
  readonly dragPointerDelta = signal<{ x: number; y: number }>({ x: 0, y: 0 });
  readonly dragCandidateSlot = signal<{
    col: number;
    row: number;
    colSpan: number;
    rowSpan: number;
    isValid: boolean;
  } | null>(null);

  private dragStartX = 0;
  private dragStartY = 0;
  private dragUnitWidth = 140;
  private dragUnitHeight = 140;
  private isPointerDownOnHandle = false;
  private pendingDragWidget: DashboardWidgetConfig | null = null;

  // Stan dla aktywnego skalowania
  private resizingWidget: DashboardWidgetConfig | null = null;
  private resizeStartX = 0;
  private resizeStartY = 0;
  private resizeStartColSpan = 1;
  private resizeStartRowSpan = 1;
  private resizeUnitWidth = 140;
  private resizeUnitHeight = 140;

  // --- OBSŁUGA UNIESIENIA I PRZENOSZENIA KAFELKA ---
  onDragPointerDown(widget: DashboardWidgetConfig, event: PointerEvent, cellElem: HTMLElement): void {
    if (!this.layoutService.isEditMode() || event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();

    this.isPointerDownOnHandle = true;
    this.pendingDragWidget = widget;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;

    const rect = cellElem.getBoundingClientRect();
    this.dragUnitWidth = Math.max(80, rect.width / widget.colSpan);
    this.dragUnitHeight = Math.max(80, rect.height / widget.rowSpan);

    try {
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  }

  // --- OBSŁUGA SKALOWANIA W PRAWYM DOLNYM ROGU ---
  onResizePointerDown(widget: DashboardWidgetConfig, event: PointerEvent, cellElem: HTMLElement): void {
    if (!this.layoutService.isEditMode() || event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();

    this.resizingWidget = widget;
    this.resizeStartX = event.clientX;
    this.resizeStartY = event.clientY;
    this.resizeStartColSpan = widget.colSpan;
    this.resizeStartRowSpan = widget.rowSpan;

    const rect = cellElem.getBoundingClientRect();
    this.resizeUnitWidth = Math.max(80, rect.width / widget.colSpan);
    this.resizeUnitHeight = Math.max(80, rect.height / widget.rowSpan);

    try {
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  }

  @HostListener('window:pointermove', ['$event'])
  onPointerMove(event: PointerEvent): void {
    // 1. Skalowanie kafelka
    if (this.resizingWidget) {
      const deltaX = event.clientX - this.resizeStartX;
      const deltaY = event.clientY - this.resizeStartY;

      const stepX = Math.round(deltaX / this.resizeUnitWidth);
      const stepY = Math.round(deltaY / this.resizeUnitHeight);

      const targetColSpan = Math.max(1, this.resizeStartColSpan + stepX);
      const targetRowSpan = Math.max(1, this.resizeStartRowSpan + stepY);

      this.layoutService.setWidgetSpanWithSpaceCheck(
        this.resizingWidget.id,
        targetColSpan,
        targetRowSpan
      );
      return;
    }

    // 2. Przeciąganie i uniesienie kafelka
    if (this.isPointerDownOnHandle && this.pendingDragWidget) {
      const dx = event.clientX - this.dragStartX;
      const dy = event.clientY - this.dragStartY;

      if (!this.activeDragWidget() && Math.hypot(dx, dy) > 4) {
        this.activeDragWidget.set(this.pendingDragWidget);
      }

      if (this.activeDragWidget()) {
        const w = this.activeDragWidget()!;
        this.dragPointerDelta.set({ x: dx, y: dy });

        const stepX = Math.round(dx / this.dragUnitWidth);
        const stepY = Math.round(dy / this.dragUnitHeight);

        const candCol = Math.max(1, Math.min(8 - w.colSpan + 1, w.col + stepX));
        const candRow = Math.max(1, w.row + stepY);

        const isValid = this.layoutService.canPlaceWidget(
          w.id,
          candCol,
          candRow,
          w.colSpan,
          w.rowSpan
        );

        this.dragCandidateSlot.set({
          col: candCol,
          row: candRow,
          colSpan: w.colSpan,
          rowSpan: w.rowSpan,
          isValid
        });
      }
    }
  }

  @HostListener('window:pointerup')
  @HostListener('window:pointercancel')
  onPointerUp(): void {
    // Zakończenie skalowania
    if (this.resizingWidget) {
      this.resizingWidget = null;
    }

    // Zakończenie przeciągania
    if (this.activeDragWidget()) {
      const slot = this.dragCandidateSlot();
      if (slot && slot.isValid) {
        this.layoutService.setWidgetPosition(
          this.activeDragWidget()!.id,
          slot.col,
          slot.row
        );
      }
    }

    this.isPointerDownOnHandle = false;
    this.pendingDragWidget = null;
    this.activeDragWidget.set(null);
    this.dragCandidateSlot.set(null);
    this.dragPointerDelta.set({ x: 0, y: 0 });
  }
}



