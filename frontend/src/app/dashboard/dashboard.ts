import { Component, signal, computed, inject, HostListener, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardLayoutService, DashboardWidgetConfig } from '../services/dashboard-layout.service';
import { MeasurementsService, MeasurementRecord, AlcoholLevel, DietType } from '../services/measurements.service';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
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
  xPct: number;
  yPct: number;
  val: number;
  date: string;
  formatted: string;
}

export interface BodyCompartmentItem {
  id: 'bones' | 'muscle' | 'fat' | 'water';
  label: string;
  percent: number;
  kg: number;
  color: string;
}

export interface SilhouetteLayerData {
  id: 'bones' | 'muscle' | 'fat' | 'water';
  label: string;
  percent: number;
  kg: number;
  color: string;
  strokeWidth: number;
  headRadius: number;
  layerThickness: number;
}

export interface DietOption {
  type: DietType;
  label: string;
  subLabel: string;
  color: string;
  badgeClass: string;
}

export interface AlcoholOption {
  level: AlcoholLevel;
  label: string;
  subLabel: string;
  color: string;
  badgeClass: string;
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
  ketoneLevel: 'none',
  alcohol: 'none',
  diet: 'keto',
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
  readonly authService = inject(AuthService);
  readonly notificationService = inject(NotificationService);

  constructor() {
    effect(() => {
      if (this.measurementsService.isModalOpen() && !this.isEditing()) {
        this.resetToNewEntry();
      }
    });
  }

  // Płeć użytkownika (zsynchronizowana globalnie z profilem użytkownika w AuthService)
  readonly userGender = this.authService.userGender;

  // Metadane wszystkich mierzonych parametrów
  readonly paramList: ParamMeta[] = [
    { key: 'weight', label: 'Waga', unit: 'kg', color: '#06b6d4', gradientId: 'grad-weight' },
    { key: 'totalBodyWater', label: 'Nawodnienie komórkowe', unit: '%', color: '#3b82f6', gradientId: 'grad-tbw' },
    { key: 'overfat', label: 'Overfat (Tłuszcz)', unit: '%', color: '#f59e0b', gradientId: 'grad-fat' },
    { key: 'muscleMass', label: 'Mięśnie', unit: '%', color: '#f43f5e', gradientId: 'grad-muscle' },
    { key: 'boneMass', label: 'Kości', unit: '%', color: '#a855f7', gradientId: 'grad-bones' },
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

  readonly muscleKg = computed(() => {
    const m = this.current();
    if (!m.weight || m.weight === 0) return 0;
    return Math.round((m.weight * (m.muscleMass / 100)) * 10) / 10;
  });

  readonly boneKg = computed(() => {
    const m = this.current();
    if (!m.weight || m.weight === 0) return 0;
    return Math.round((m.weight * (m.boneMass / 100)) * 10) / 10;
  });

  // Ewaluacja stanu ketozy (Brak pomiaru / Brak ketozy / Ketoza aktywna)
  readonly isKetosisActive = computed(() => {
    const level = this.current().ketoneLevel;
    return level === 'trace' || level === 'low' || level === 'moderate' || level === 'high';
  });

  readonly ketoneBadgeText = computed(() => {
    const level = this.current().ketoneLevel;
    if (!level || level === 'none') return 'BRAK POMIARU';
    if (level === 'negative') return 'BRAK KETOZY';
    return 'KETOZA AKTYWNA';
  });

  // Stan na dziś dla kafelka ketonów w moczu (pasek poziomy z przybliżoną wartością na środku)
  readonly ketoneTodayBar = computed(() => {
    const m = this.current();
    const level = m.ketoneLevel || 'none';
    const rawText = m.urineKetones || '';

    let color = 'rgba(255, 255, 255, 0.15)';
    let widthPct = 0;
    let label = 'Brak pomiaru';

    switch (level) {
      case 'negative':
        color = '#94a3b8';
        widthPct = 12;
        label = '< 0.5 mmol/L';
        break;
      case 'trace':
        color = '#ec4899';
        widthPct = 32;
        label = '≈ 0.5 mmol/L (Ślad)';
        break;
      case 'low':
        color = '#f43f5e';
        widthPct = 56;
        label = '≈ 1.5 mmol/L (Lekka)';
        break;
      case 'moderate':
        color = '#e11d48';
        widthPct = 78;
        label = '≈ 4.0 mmol/L (Optymalna)';
        break;
      case 'high':
        color = '#be123c';
        widthPct = 100;
        label = '8.0+ mmol/L (Głęboka)';
        break;
      default:
        color = 'rgba(255, 255, 255, 0.12)';
        widthPct = 0;
        label = rawText && rawText !== 'Brak danych' ? rawText : 'Brak pomiaru';
        break;
    }

    return {
      level,
      color,
      widthPct,
      displayLabel: label
    };
  });

  // Szczegółowa klasyfikacja BMI zgodna z wytycznymi medycznymi
  readonly bmiEvaluation = computed(() => {
    const bmi = this.current().bmi;
    if (!bmi || bmi <= 0) {
      return { label: 'Brak danych', fullLabel: 'Brak danych', statusClass: 'status-muted' };
    }
    if (bmi < 16.0) {
      return { label: 'Wyczerpanie (wygłodzenie)', fullLabel: 'Wyczerpanie (wygłodzenie: < 16,0)', statusClass: 'status-danger' };
    }
    if (bmi < 17.0) {
      return { label: 'Wychudzenie', fullLabel: 'Wychudzenie: 16,0 – 16,9', statusClass: 'status-danger' };
    }
    if (bmi < 18.5) {
      return { label: 'Lekka niedowaga', fullLabel: 'Lekka niedowaga: 17,0 – 18,4', statusClass: 'status-warning' };
    }
    if (bmi < 25.0) {
      return { label: 'Waga prawidłowa', fullLabel: 'Waga prawidłowa: 18,5 – 24,9', statusClass: 'status-good' };
    }
    if (bmi < 30.0) {
      return { label: 'Nadwaga', fullLabel: 'Nadwaga: 25,0 – 29,9', statusClass: 'status-warning' };
    }
    if (bmi < 35.0) {
      return { label: 'Otyłość I stopnia', fullLabel: 'Otyłość I stopnia: 30,0 – 34,9', statusClass: 'status-danger' };
    }
    if (bmi < 40.0) {
      return { label: 'Otyłość II st. (kliniczna)', fullLabel: 'Otyłość II stopnia (kliniczna): 35,0 – 39,9', statusClass: 'status-danger' };
    }
    return { label: 'Otyłość III st. (skrajna)', fullLabel: 'Otyłość III stopnia (skrajna): ≥ 40,0', statusClass: 'status-danger' };
  });

  // Szczegółowa ocena zawartości tkanki tłuszczowej z podziałem na kobiety i mężczyzn
  readonly fatEvaluation = computed(() => {
    const fat = this.current().overfat;
    const isFemale = this.userGender() === 'female';
    if (!fat || fat <= 0) {
      return { label: 'Brak danych', fullLabel: 'Brak danych', normText: isFemale ? 'Norma K: 21–31%' : 'Norma M: 14–24%', statusClass: 'status-muted' };
    }

    if (isFemale) {
      if (fat < 14.0) {
        return { label: 'Poniżej normy (<14%)', fullLabel: 'Poniżej normy (< 14%)', normText: 'Norma K: 21–31%', statusClass: 'status-warning' };
      }
      if (fat <= 20.9) {
        return { label: 'Niska (atletyczna)', fullLabel: 'Niska (atletyczna: 14–20%)', normText: 'Norma K: 21–31%', statusClass: 'status-info' };
      }
      if (fat <= 31.9) {
        return { label: 'W normie (fit)', fullLabel: 'W normie (fit / przeciętna: 21–31%)', normText: 'Norma K: 21–31%', statusClass: 'status-good' };
      }
      if (fat <= 38.0) {
        return { label: 'Overfat (nadmiar)', fullLabel: 'Overfat (nadmiar tłuszczu: 32–38%)', normText: 'Norma K: 21–31%', statusClass: 'status-warning' };
      }
      return { label: 'Obese (otyłość)', fullLabel: 'Obese (otyłość: > 38%)', normText: 'Norma K: 21–31%', statusClass: 'status-danger' };
    } else {
      if (fat < 6.0) {
        return { label: 'Poniżej normy (<6%)', fullLabel: 'Poniżej normy (< 6%)', normText: 'Norma M: 14–24%', statusClass: 'status-warning' };
      }
      if (fat <= 13.9) {
        return { label: 'Niska (atletyczna)', fullLabel: 'Niska (atletyczna: 6–13%)', normText: 'Norma M: 14–24%', statusClass: 'status-info' };
      }
      if (fat <= 24.9) {
        return { label: 'W normie (fit)', fullLabel: 'W normie (fit / przeciętna: 14–24%)', normText: 'Norma M: 14–24%', statusClass: 'status-good' };
      }
      if (fat <= 30.0) {
        return { label: 'Overfat (nadmiar)', fullLabel: 'Overfat (nadmiar tłuszczu: 25–30%)', normText: 'Norma M: 14–24%', statusClass: 'status-warning' };
      }
      return { label: 'Obese (otyłość)', fullLabel: 'Obese (otyłość: > 30%)', normText: 'Norma M: 14–24%', statusClass: 'status-danger' };
    }
  });

  // Interaktywny hover nad warstwą sylwetki
  readonly hoveredLayer = signal<string | null>(null);

  setHoveredLayer(id: string | null): void {
    this.hoveredLayer.set(id);
  }

  // Skład ciała w podziale 4-kompartmentowym: Kości -> Mięśnie -> Tłuszcz -> Woda
  readonly bodyComposition = computed<BodyCompartmentItem[]>(() => {
    const m = this.current();
    const w = m.weight;
    if (!w || w === 0) {
      return [
        { id: 'bones', label: 'Kości (Minerały)', percent: 0, kg: 0, color: '#a855f7' },
        { id: 'muscle', label: 'Mięśnie & Białko', percent: 0, kg: 0, color: '#f43f5e' },
        { id: 'fat', label: 'Tłuszcz (Fat)', percent: 0, kg: 0, color: '#f59e0b' },
        { id: 'water', label: 'Woda (TBW)', percent: 0, kg: 0, color: '#3b82f6' }
      ];
    }

    const bonePct = m.boneMass;
    const boneKg = Math.round((w * (bonePct / 100)) * 10) / 10;

    const fatPct = m.overfat;
    const fatKg = Math.round((w * (fatPct / 100)) * 10) / 10;

    const waterPct = m.totalBodyWater;
    const waterKg = Math.round((w * (waterPct / 100)) * 10) / 10;

    const musclePct = m.muscleMass;
    const muscleKg = Math.round((w * (musclePct / 100)) * 10) / 10;

    return [
      { id: 'bones', label: 'Kości (Minerały)', percent: bonePct, kg: boneKg, color: '#a855f7' },
      { id: 'muscle', label: 'Mięśnie & Białko', percent: musclePct, kg: muscleKg, color: '#f43f5e' },
      { id: 'fat', label: 'Tłuszcz (Fat)', percent: fatPct, kg: fatKg, color: '#f59e0b' },
      { id: 'water', label: 'Woda (TBW)', percent: waterPct, kg: waterKg, color: '#3b82f6' }
    ];
  });

  // Koncentryczne warstwy sylwetki człowieka (obrysy Painter's Algorithm: Woda -> Tłuszcz -> Mięśnie -> Kości)
  readonly silhouetteLayers = computed(() => {
    const comp = this.bodyComposition();
    const bones = comp.find(c => c.id === 'bones') || comp[0];
    const muscle = comp.find(c => c.id === 'muscle') || comp[1];
    const fat = comp.find(c => c.id === 'fat') || comp[2];
    const water = comp.find(c => c.id === 'water') || comp[3];

    // Cienki, bazowy rdzeń szkieletu kości (statyczna wąska linia 2px)
    const baseBoneStroke = 2;
    // Maksymalny budżet promieniowego pogrubiania obrysów (K)
    const maxExpansionBudget = 38;

    const m = this.current();
    const hasData = m.weight > 0;

    const tMuscle = hasData ? Math.max(2, Math.round(((muscle.percent || 25) / 100) * maxExpansionBudget * 10) / 10) : 6.0;
    const tFat = hasData ? Math.max(2, Math.round(((fat.percent || 20) / 100) * maxExpansionBudget * 10) / 10) : 10.0;
    const tWater = hasData ? Math.max(2, Math.round(((water.percent || 50) / 100) * maxExpansionBudget * 10) / 10) : 20.5;

    const strokeBones = baseBoneStroke;
    const strokeMuscle = Math.round((strokeBones + 2 * tMuscle) * 10) / 10;
    const strokeFat = Math.round((strokeMuscle + 2 * tFat) * 10) / 10;
    const strokeWater = Math.round((strokeFat + 2 * tWater) * 10) / 10;

    const rBones = 4.5;
    const rMuscle = Math.round((rBones + tMuscle) * 10) / 10;
    const rFat = Math.round((rMuscle + tFat) * 10) / 10;
    const rWater = Math.round((rFat + tWater) * 10) / 10;

    return {
      bones: { ...bones, strokeWidth: strokeBones, headRadius: rBones, layerThickness: baseBoneStroke },
      muscle: { ...muscle, strokeWidth: strokeMuscle, headRadius: rMuscle, layerThickness: tMuscle },
      fat: { ...fat, strokeWidth: strokeFat, headRadius: rFat, layerThickness: tFat },
      water: { ...water, strokeWidth: strokeWater, headRadius: rWater, layerThickness: tWater }
    };
  });

  // Dane posortowane chronologicznie do renderowania wykresów (od najstarszego do najnowszego)
  readonly chronologicalHistory = computed(() => {
    return [...this.history()].reverse();
  });

  // Metadane aktywnego parametru na wykresie głównym
  readonly activeParamMeta = computed(() => {
    return this.paramList.find(p => p.key === this.activeParamKey()) || this.paramList[0];
  });

  // Obliczanie wektorów głównego wykresu SVG i punktów overlay HTML
  readonly mainChartData = computed(() => {
    const records = this.chronologicalHistory();
    const key = this.activeParamKey();
    const meta = this.activeParamMeta();

    if (records.length === 0) {
      return {
        points: [] as ChartPoint[],
        linePath: '',
        areaPath: '',
        minVal: 0,
        maxVal: 0,
        minValFormatted: '0',
        maxValFormatted: '0',
        midValFormatted: '0',
        delta: 0,
        isSingle: false
      };
    }

    if (records.length === 1) {
      const val = Number(records[0][key]) || 0;
      const displayMin = val > 0 ? Math.round((val * 0.9) * 10) / 10 : 0;
      const displayMax = val > 0 ? Math.round((val * 1.1) * 10) / 10 : 10;
      const midVal = val;
      const pts: ChartPoint[] = [{
        x: 500,
        y: 500,
        xPct: 50,
        yPct: 50,
        val,
        date: records[0].date && records[0].date !== '-' ? records[0].date.substring(5) : '-',
        formatted: `${val} ${meta.unit}`
      }];

      return {
        points: pts,
        linePath: 'M 0 500 L 1000 500',
        areaPath: 'M 0 500 L 1000 500 L 1000 1000 L 0 1000 Z',
        minVal: displayMin,
        maxVal: displayMax,
        minValFormatted: `${displayMin} ${meta.unit}`,
        maxValFormatted: `${displayMax} ${meta.unit}`,
        midValFormatted: `${midVal} ${meta.unit}`,
        delta: 0,
        isSingle: true
      };
    }

    const values = records.map(r => Number(r[key]) || 0);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    
    let displayMin = minVal;
    let displayMax = maxVal;
    if (minVal === maxVal) {
      displayMin = minVal > 0 ? Math.round((minVal * 0.9) * 10) / 10 : 0;
      displayMax = maxVal > 0 ? Math.round((maxVal * 1.1) * 10) / 10 : 10;
    } else {
      const margin = (maxVal - minVal) * 0.15;
      displayMin = Math.round((minVal - margin) * 10) / 10;
      displayMax = Math.round((maxVal + margin) * 10) / 10;
    }

    const range = displayMax - displayMin || 1;
    const midVal = Math.round(((displayMin + displayMax) / 2) * 10) / 10;

    const leftPadPct = 8;
    const rightPadPct = 8;
    const availableWidthPct = 100 - leftPadPct - rightPadPct;
    const topPadPct = 14;
    const bottomPadPct = 14;
    const availableHeightPct = 100 - topPadPct - bottomPadPct;

    const points: ChartPoint[] = records.map((r, i) => {
      const val = Number(r[key]) || 0;
      const xPct = leftPadPct + (i / (records.length - 1)) * availableWidthPct;
      const yPct = (100 - bottomPadPct) - ((val - displayMin) / range) * availableHeightPct;
      const svgX = xPct * 10;
      const svgY = yPct * 10;
      return {
        x: Math.round(svgX * 10) / 10,
        y: Math.round(svgY * 10) / 10,
        xPct: Math.round(xPct * 10) / 10,
        yPct: Math.round(yPct * 10) / 10,
        val,
        date: r.date && r.date !== '-' ? r.date.substring(5) : '-',
        formatted: `${val} ${meta.unit}`
      };
    });

    let linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const cx = (p0.x + p1.x) / 2;
      linePath += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    const areaPath = `${linePath} L ${points[points.length - 1].x} 1000 L ${points[0].x} 1000 Z`;

    return {
      points,
      linePath,
      areaPath,
      minVal: displayMin,
      maxVal: displayMax,
      minValFormatted: `${displayMin} ${meta.unit}`,
      maxValFormatted: `${displayMax} ${meta.unit}`,
      midValFormatted: `${midVal} ${meta.unit}`,
      delta: Math.round((values[values.length - 1] - values[0]) * 10) / 10,
      isSingle: false
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
  readonly isMeasurementModalOpen = this.measurementsService.isModalOpen;
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

  readonly ketoneOptions: { level: 'none' | 'negative' | 'trace' | 'low' | 'moderate' | 'high'; label: string; text: string; value: number; color: string; displayNum: string }[] = [
    { level: 'none', label: 'Brak', text: 'Brak pomiaru', value: 0, color: '#64748b', displayNum: '0.0 mmol/L' },
    { level: 'negative', label: 'Negatywny', text: 'Negatywny (< 0.5 mmol/L)', value: 0.1, color: '#94a3b8', displayNum: '< 0.5 mmol/L' },
    { level: 'trace', label: 'Ślad', text: '0.5 mmol/L (Ślad)', value: 0.5, color: '#ec4899', displayNum: '0.5 mmol/L' },
    { level: 'low', label: 'Lekka', text: '1.5 mmol/L (Lekka)', value: 1.5, color: '#f43f5e', displayNum: '1.5 mmol/L' },
    { level: 'moderate', label: 'Umiarkowana', text: '4.0 mmol/L (Umiarkowana)', value: 4.0, color: '#e11d48', displayNum: '4.0 mmol/L' },
    { level: 'high', label: 'Wysoka', text: '8.0+ mmol/L (Wysoka)', value: 8.0, color: '#be123c', displayNum: '8.0+ mmol/L' }
  ];

  // Opcje rejestru diety
  readonly dietOptions: DietOption[] = [
    { type: 'keto', label: 'Keto', subLabel: '', color: '#10b981', badgeClass: 'badge-diet-keto' },
    { type: 'low-carb', label: 'Low Carb', subLabel: '', color: '#3b82f6', badgeClass: 'badge-diet-low-carb' },
    { type: 'light', label: 'Lekka', subLabel: '', color: '#06b6d4', badgeClass: 'badge-diet-light' },
    { type: 'bad', label: 'Zła', subLabel: '', color: '#f43f5e', badgeClass: 'badge-diet-bad' }
  ];

  // Opcje rejestru alkoholu
  readonly alcoholOptions: AlcoholOption[] = [
    { level: 'none', label: 'Brak', subLabel: '', color: '#10b981', badgeClass: 'badge-alcohol-none' },
    { level: 'light', label: 'Lekko', subLabel: '', color: '#f59e0b', badgeClass: 'badge-alcohol-light' },
    { level: 'heavy', label: 'Ciężko', subLabel: '', color: '#f43f5e', badgeClass: 'badge-alcohol-heavy' }
  ];

  // Ewaluacja diety dla aktywnego rekordu
  readonly currentDiet = computed(() => {
    const d = this.current().diet || 'keto';
    if (d === 'low-carbon') {
      return this.dietOptions.find(opt => opt.type === 'low-carb') || this.dietOptions[0];
    }
    return this.dietOptions.find(opt => opt.type === d) || this.dietOptions[0];
  });

  getDietLabel(diet?: string): string {
    if (diet === 'keto') return 'Keto';
    if (diet === 'low-carb' || diet === 'low-carbon') return 'Low Carb';
    if (diet === 'light') return 'Lekka';
    if (diet === 'bad') return 'Zła';
    return 'Keto';
  }

  // Ewaluacja alkoholu dla aktywnego rekordu
  readonly currentAlcohol = computed(() => {
    const a = this.current().alcohol || 'none';
    return this.alcoholOptions.find(opt => opt.level === a) || this.alcoholOptions[0];
  });

  // Minimalistyczne statystyki spożycia alkoholu (wyłącznie numer ile dni i rodzaj spożycia)
  readonly alcoholStats = computed(() => {
    const list = this.history();
    if (list.length === 0) {
      return {
        daysCount: 0,
        lastLevel: 'none' as AlcoholLevel,
        lastLabel: 'Brak'
      };
    }

    // Szukamy najnowszego wpisu z odnotowanym alkoholem (light lub heavy)
    const lastAlcoholIndex = list.findIndex(m => m.alcohol === 'light' || m.alcohol === 'heavy');

    if (lastAlcoholIndex === -1) {
      // Brak alkoholu we wszystkich wpisach
      let totalDays = 0;
      try {
        const dLatest = new Date(list[0].date).getTime();
        const dOldest = new Date(list[list.length - 1].date).getTime();
        totalDays = Math.max(0, Math.floor((dLatest - dOldest) / (1000 * 60 * 60 * 24)));
      } catch {
        totalDays = list.length;
      }
      return {
        daysCount: totalDays,
        lastLevel: 'none' as AlcoholLevel,
        lastLabel: 'Brak'
      };
    }

    const lastAlcoholRecord = list[lastAlcoholIndex];
    const currentRecord = this.current();

    let days = 0;
    try {
      const refDateStr = currentRecord.date && currentRecord.date !== '-' ? currentRecord.date : new Date().toISOString().split('T')[0];
      const alcDateStr = lastAlcoholRecord.date;
      const d1 = new Date(refDateStr).getTime();
      const d2 = new Date(alcDateStr).getTime();
      const diffTime = d1 - d2;
      days = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    } catch {
      days = lastAlcoholIndex;
    }

    const opt = this.alcoholOptions.find(o => o.level === lastAlcoholRecord.alcohol) || this.alcoholOptions[0];

    return {
      daysCount: days,
      lastLevel: lastAlcoholRecord.alcohol || 'none',
      lastLabel: opt.label
    };
  });

  // Pola formularza pomiaru
  readonly newEntryDate = signal<string>('');
  readonly newEntryTime = signal<string>('');
  readonly newEntryWeight = signal<number>(78.5);
  readonly newEntryTBW = signal<number>(59.0);
  readonly newEntryOverfat = signal<number>(15.8);
  readonly newEntryMuscle = signal<number>(38.5);
  readonly newEntryBones = signal<number>(3.4);
  readonly newEntryBmi = signal<number>(23.7);
  readonly newEntryKcal = signal<number>(1845);
  readonly newEntryKetoneLevel = signal<'none' | 'negative' | 'trace' | 'low' | 'moderate' | 'high'>('none');
  readonly newEntryAlcohol = signal<AlcoholLevel>('none');
  readonly newEntryDiet = signal<DietType>('keto');
  readonly newEntryNotes = signal<string>('');

  openAddMeasurementModal(): void {
    this.resetToNewEntry();
    this.measurementsService.openModal();
  }

  closeMeasurementModal(): void {
    this.measurementsService.closeModal();
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
      this.newEntryAlcohol.set(latest.alcohol || 'none');
      this.newEntryDiet.set(latest.diet || 'keto');
      this.newEntryNotes.set('');
    } else {
      this.newEntryWeight.set(75.0);
      this.newEntryTBW.set(58.0);
      this.newEntryOverfat.set(16.0);
      this.newEntryMuscle.set(38.0);
      this.newEntryBones.set(3.3);
      this.newEntryBmi.set(22.6);
      this.newEntryKcal.set(1800);
      this.newEntryKetoneLevel.set('none');
      this.newEntryAlcohol.set('none');
      this.newEntryDiet.set('keto');
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
    this.newEntryAlcohol.set(record.alcohol || 'none');
    this.newEntryDiet.set(record.diet || 'keto');
    this.newEntryNotes.set(record.notes || '');

    this.formSuccessMessage.set('');
    this.measurementsService.openModal();
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
      alcohol: this.newEntryAlcohol(),
      diet: this.newEntryDiet(),
      notes: this.newEntryNotes()
    };

    const editId = this.editingRecordId();
    if (editId) {
      await this.measurementsService.updateMeasurement(editId, payload);
      this.closeMeasurementModal();
      this.notificationService.showSuccess('Dodano pomiar');
    } else {
      const saved = await this.measurementsService.addMeasurement(payload);
      if (saved) {
        this.selectedIndex.set(0);
        this.closeMeasurementModal();
        this.notificationService.showSuccess('Dodano pomiar');
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



