import { Component, signal, computed, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardLayoutService, DashboardWidgetConfig } from '../services/dashboard-layout.service';
import { MeasurementsService, MeasurementRecord } from '../services/measurements.service';
import { ModalComponent } from '../components/modal/modal';

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

export const EMPTY_MEASUREMENT: MeasurementRecord = {
  id: '',
  date: '-',
  time: '--:--',
  weight: 0,
  totalBodyWater: 0,
  overfat: 0,
  muscleMass: 0,
  boneMass: 0,
  bmi: 0,
  kcal: 0,
  urineKetones: 'Brak danych',
  ketoneValue: 0,
  ketoneLevel: 'negative',
  notes: 'Brak danych pomiarowych'
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent {
  readonly layoutService = inject(DashboardLayoutService);
  readonly measurementsService = inject(MeasurementsService);

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

  // Pomiary biometryczne zasilane przez serwis backendowy
  readonly history = this.measurementsService.history;

  // Czy istnieją jakiekolwiek zapisane pomiary
  readonly hasMeasurements = computed(() => this.history().length > 0);

  // Indeks aktywnego rekordu wybranego na kafelkach
  readonly selectedIndex = signal<number>(0);

  // Aktywny rekord (zabezpieczony przed pustą tablicą)
  readonly current = computed(() => {
    const list = this.history();
    if (list.length === 0) return EMPTY_MEASUREMENT;
    return list[this.selectedIndex()] || list[0] || EMPTY_MEASUREMENT;
  });

  // Poprzedni pomiar
  readonly previous = computed(() => {
    const list = this.history();
    if (list.length <= 1) return null;
    return list[this.selectedIndex() + 1] || null;
  });

  // Obliczenia różnic / trendów
  readonly weightDelta = computed(() => {
    if (!this.hasMeasurements()) return null;
    const prev = this.previous();
    if (!prev || prev.weight === 0) return null;
    const diff = this.current().weight - prev.weight;
    return Math.round(diff * 10) / 10;
  });

  readonly waterLiters = computed(() => {
    const m = this.current();
    if (!m.weight || m.weight === 0) return 0;
    return Math.round((m.weight * (m.totalBodyWater / 100)) * 10) / 10;
  });

  readonly musclePercent = computed(() => {
    const m = this.current();
    if (!m.weight || m.weight === 0) return 0;
    return Math.round((m.muscleMass / m.weight) * 1000) / 10;
  });

  // Skład ciała w podziale 4-kompartmentowym (Woda, Tłuszcz, Białko/Mięśnie, Minerały kości)
  readonly bodyComposition = computed<BodyCompartmentItem[]>(() => {
    const m = this.current();
    const w = m.weight;
    if (!w || w === 0) {
      return [
        { id: 'water', label: 'Woda (TBW)', percent: 0, kg: 0, color: '#3b82f6' },
        { id: 'muscle', label: 'Mięśnie & Białko', percent: 0, kg: 0, color: '#10b981' },
        { id: 'fat', label: 'Tłuszcz (Fat)', percent: 0, kg: 0, color: '#f59e0b' },
        { id: 'bones', label: 'Kości (Minerały)', percent: 0, kg: 0, color: '#a855f7' }
      ];
    }

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

    if (records.length === 0) {
      return {
        width,
        height,
        points: [],
        linePath: '',
        areaPath: '',
        minVal: 0,
        maxVal: 0,
        delta: 0
      };
    }

    const values = records.map(r => Number(r[key]) || 0);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = (maxVal - minVal) === 0 ? 1 : (maxVal - minVal);
    const plotHeight = height - padding.top - padding.bottom;
    const plotWidth = width - padding.left - padding.right;

    const points: ChartPoint[] = records.map((r, i) => {
      const val = Number(r[key]) || 0;
      const x = records.length > 1
        ? padding.left + (i / (records.length - 1)) * plotWidth
        : width / 2;
      const y = height - padding.bottom - ((val - minVal) / range) * plotHeight;
      return {
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        val,
        date: r.date && r.date !== '-' ? r.date.substring(5) : '-',
        formatted: `${val} ${meta.unit}`
      };
    });

    let linePath = '';
    if (points.length === 1) {
      linePath = `M ${padding.left} ${points[0].y} L ${width - padding.right} ${points[0].y}`;
    } else if (points.length > 1) {
      linePath = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        const p0 = points[i - 1];
        const p1 = points[i];
        const cx = (p0.x + p1.x) / 2;
        linePath += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
      }
    }

    const areaPath = linePath && points.length > 0
      ? `${linePath} L ${points.length > 1 ? points[points.length - 1].x : width - padding.right} ${height - padding.bottom} L ${points.length > 1 ? points[0].x : padding.left} ${height - padding.bottom} Z`
      : '';

    return {
      width,
      height,
      points,
      linePath,
      areaPath,
      minVal,
      maxVal,
      delta: records.length > 1 ? Math.round((values[values.length - 1] - values[0]) * 10) / 10 : 0
    };
  });

  // Generator małych wykresów typu Sparkline dla pojedynczych kafelków
  getSparkline(key: ChartParamKey, width = 100, height = 32): { line: string; area: string } {
    const records = this.chronologicalHistory();
    if (records.length === 0) return { line: '', area: '' };

    const values = records.map(r => Number(r[key]) || 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = (max - min) === 0 ? 1 : (max - min);
    const pad = 4;
    const plotH = height - pad * 2;
    const plotW = width - pad * 2;

    if (records.length === 1) {
      const y = Math.round(height / 2);
      const line = `M ${pad} ${y} L ${width - pad} ${y}`;
      const area = `${line} L ${width - pad} ${height} L ${pad} ${height} Z`;
      return { line, area };
    }

    const pts = records.map((r, i) => {
      const val = Number(r[key]) || 0;
      const x = pad + (i / (records.length - 1)) * plotW;
      const y = height - pad - ((val - min) / range) * plotH;
      return { x: Math.round(x), y: Math.round(y) };
    });

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

  // --- MODAL REJESTRU I DODAWANIA/EDYCJI POMIARÓW BIOMETRII ---
  readonly isMeasurementModalOpen = signal<boolean>(false);
  readonly isFormExpanded = signal<boolean>(true);
  readonly formSuccessMessage = signal<string>('');
  readonly editingRecordId = signal<string | null>(null);
  readonly isEditing = computed(() => this.editingRecordId() !== null);

  readonly editingRecordIndex = computed(() => {
    const id = this.editingRecordId();
    if (!id) return null;
    const idx = this.history().findIndex(m => m.id === id);
    return idx !== -1 ? this.history().length - idx : null;
  });

  // Pola formularza pomiaru
  readonly newEntryDate = signal<string>('');
  readonly newEntryTime = signal<string>('');
  readonly newEntryWeight = signal<number>(78.5);
  readonly newEntryTBW = signal<number>(59.0);
  readonly newEntryOverfat = signal<number>(15.8);
  readonly newEntryMuscle = signal<number>(62.5);
  readonly newEntryBones = signal<number>(3.4);
  readonly newEntryBmi = signal<number>(23.7);
  readonly newEntryKcal = signal<number>(1845);
  readonly newEntryKetoneLevel = signal<'none' | 'negative' | 'trace' | 'low' | 'moderate' | 'high'>('none');
  readonly newEntryNotes = signal<string>('');

  readonly ketoneOptions: { level: 'none' | 'negative' | 'trace' | 'low' | 'moderate' | 'high'; label: string; text: string; value: number; color: string }[] = [
    { level: 'none', label: 'Brak pomiaru', text: 'Brak pomiaru', value: 0, color: '#64748b' },
    { level: 'negative', label: 'Negatywny', text: 'Negatywny (< 0.5 mmol/L)', value: 0.1, color: '#94a3b8' },
    { level: 'trace', label: 'Ślad', text: '0.5 mmol/L (Ślad)', value: 0.5, color: '#ec4899' },
    { level: 'low', label: 'Lekka', text: '1.5 mmol/L (Lekka)', value: 1.5, color: '#f43f5e' },
    { level: 'moderate', label: 'Umiarkowana', text: '4.0 mmol/L (Umiarkowana)', value: 4.0, color: '#e11d48' },
    { level: 'high', label: 'Wysoka', text: '8.0+ mmol/L (Wysoka)', value: 8.0, color: '#be123c' }
  ];

  openAddMeasurementModal(): void {
    this.resetToNewEntry();
    this.isMeasurementModalOpen.set(true);
  }

  closeMeasurementModal(): void {
    this.isMeasurementModalOpen.set(false);
  }

  toggleFormExpanded(): void {
    this.isFormExpanded.update(v => !v);
  }

  resetToNewEntry(): void {
    this.editingRecordId.set(null);
    this.isFormExpanded.set(true);

    const now = new Date();
    const latest = this.history()[0];

    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');

    this.newEntryDate.set(`${yyyy}-${mm}-${dd}`);
    this.newEntryTime.set(`${hh}:${min}`);

    // Domyślne dane to te z poprzedniego/najnowszego wpisu
    if (latest && latest.weight > 0) {
      this.newEntryWeight.set(latest.weight);
      this.newEntryTBW.set(latest.totalBodyWater);
      this.newEntryOverfat.set(latest.overfat);
      this.newEntryMuscle.set(latest.muscleMass);
      this.newEntryBones.set(latest.boneMass);
      this.newEntryBmi.set(latest.bmi);
      this.newEntryKcal.set(latest.kcal);
      this.newEntryKetoneLevel.set(latest.ketoneLevel || 'none');
      this.newEntryNotes.set('');
    } else {
      this.newEntryWeight.set(75.0);
      this.newEntryTBW.set(58.0);
      this.newEntryOverfat.set(16.0);
      this.newEntryMuscle.set(60.0);
      this.newEntryBones.set(3.3);
      this.newEntryBmi.set(22.6);
      this.newEntryKcal.set(1800);
      this.newEntryKetoneLevel.set('none');
      this.newEntryNotes.set('');
    }

    this.formSuccessMessage.set('');
  }

  startEditingRecord(record: MeasurementRecord, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    this.editingRecordId.set(record.id);
    this.isFormExpanded.set(true);

    this.newEntryDate.set(record.date);
    this.newEntryTime.set(record.time);
    this.newEntryWeight.set(record.weight);
    this.newEntryTBW.set(record.totalBodyWater);
    this.newEntryOverfat.set(record.overfat);
    this.newEntryMuscle.set(record.muscleMass);
    this.newEntryBones.set(record.boneMass);
    this.newEntryBmi.set(record.bmi);
    this.newEntryKcal.set(record.kcal);
    this.newEntryKetoneLevel.set(record.ketoneLevel || 'none');
    this.newEntryNotes.set(record.notes || '');

    this.formSuccessMessage.set('');
  }

  onWeightChange(weight: number): void {
    this.newEntryWeight.set(weight);
    // Automatyczne przeliczenie BMI przy wzroście referencyjnym ok. 182 cm
    const heightM = 1.82;
    const calcBmi = Math.round((weight / (heightM * heightM)) * 10) / 10;
    this.newEntryBmi.set(calcBmi);
  }

  async saveMeasurement(): Promise<void> {
    const selectedKetone = this.ketoneOptions.find(k => k.level === this.newEntryKetoneLevel()) || this.ketoneOptions[0];

    const payload: Omit<MeasurementRecord, 'id'> = {
      date: this.newEntryDate() || new Date().toISOString().split('T')[0],
      time: this.newEntryTime() || '08:00',
      weight: Number(this.newEntryWeight()) || 0,
      totalBodyWater: Number(this.newEntryTBW()) || 0,
      overfat: Number(this.newEntryOverfat()) || 0,
      muscleMass: Number(this.newEntryMuscle()) || 0,
      boneMass: Number(this.newEntryBones()) || 0,
      bmi: Number(this.newEntryBmi()) || 0,
      kcal: Number(this.newEntryKcal()) || 0,
      urineKetones: selectedKetone.text,
      ketoneValue: selectedKetone.value,
      ketoneLevel: selectedKetone.level,
      notes: this.newEntryNotes()
    };

    const editId = this.editingRecordId();
    if (editId) {
      await this.measurementsService.updateMeasurement(editId, payload);
      this.formSuccessMessage.set(`Wpis #${this.editingRecordIndex() || ''} został pomyślnie zaktualizowany!`);
      setTimeout(() => {
        this.formSuccessMessage.set('');
      }, 4000);
    } else {
      const saved = await this.measurementsService.addMeasurement(payload);
      if (saved) {
        this.selectedIndex.set(0);
        this.formSuccessMessage.set('Nowy rekord pomiarowy został pomyślnie dodany i utrwalony w bazie!');
        setTimeout(() => {
          this.formSuccessMessage.set('');
        }, 4000);
      }
    }
  }

  // Alias dla kompatybilności
  async saveNewMeasurement(): Promise<void> {
    return this.saveMeasurement();
  }

  async deleteMeasurementRecord(id: string, event?: Event): Promise<void> {
    if (event) {
      event.stopPropagation();
    }
    if (confirm('Czy na pewno chcesz usunąć ten wpis pomiarowy z bazy?')) {
      if (this.editingRecordId() === id) {
        this.editingRecordId.set(null);
      }
      await this.measurementsService.deleteMeasurement(id);
      if (this.selectedIndex() >= this.history().length) {
        this.selectedIndex.set(Math.max(0, this.history().length - 1));
      }
    }
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



