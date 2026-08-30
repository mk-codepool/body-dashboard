---
name: body-dashboard-workflow
description: >-
  Przewodnik i instrukcja pracy z projektem body-dashboard. Używaj przy uruchamianiu,
  rozwijaniu endpointów NestJS, komponentów Angular, modularnego grida biometrii, persystencji JSON oraz rozbudowie launchera.
---

# Workflow Projektu Body Dashboard

Niniejszy skill zawiera procedury i instrukcje krok po kroku dotyczące pracy ze stosem technologicznym projektu:
- **Frontend**: Angular 22 (Standalone + Signals, Dark Minimalist Grid System, RxJS HttpClient)
- **Backend**: NestJS (ESM + TypeScript, JSON Data Storage)
- **Launcher**: Wbudowany menedżer procesów z Web Dashboardem i SSE

---

## 1. Uruchamianie Projektu

Aby wystartować wszystkie usługi jednocześnie:

```bash
node start
```

### Co dzieje się po uruchomieniu?
1. Launcher startuje Web Dashboard pod adresem `http://localhost:4000`.
2. Otwiera automatycznie domyślną przeglądarkę pod tym adresem.
3. W tle uruchamia:
   - `npm.cmd --prefix backend run start:dev` (port 3000)
   - `npm.cmd --prefix frontend start` (port 4200)
4. W konsoli dostępny jest interaktywny panel ze skrótami:
   - `[b]` - Restart backendu
   - `[f]` - Restart frontendu
   - `[r]` - Restart obu
   - `[o]` - Ponowne otwarcie dashboardu
   - `[q]` - Bezpieczne zamknięcie (graceful shutdown)

---

## 2. Rozwijanie Frontendu (Angular) & Modularnego Grida 2D

- **Katalog**: `frontend/`
- **Root komponent**: `frontend/src/app/app.ts` (host dla górnej belki z przyciskiem "Dostosuj pulpit" i `<router-outlet />`)
- **Serwisy Danych**:
  - `frontend/src/app/services/dashboard-layout.service.ts`: reaktywne zarządzanie pozycjami 2D, trybem edycji, sprawdzaniem kolizji `canPlaceWidget`, auto-synchronizacją z `PUT /api/layout` i fallbackiem do `localStorage`.
  - `frontend/src/app/services/measurements.service.ts`: pobieranie i modyfikacja pomiarów biometrii (`history`), integracja z `/api/measurements`.
- **Routing**: `frontend/src/app/app.routes.ts` (domyślna trasa `''` kieruje do `DashboardComponent`)
- **Główny kontener widoku**: `frontend/src/app/dashboard/dashboard.ts`
- **Konwencje i Standardy Grida 2D**:
  - **Siatka Kwadratowa (Square Modular Grid)**: 8 kolumn `repeat(8, minmax(120px, 1fr))` oraz stała wysokość wiersza `135px`.
  - **Pozycjonowanie 2D**: Każdy kafelek ma współrzędne `col` (1-8), `row` (1+), `colSpan` i `rowSpan`.
  - **Minimalny rozmiar**: Każdy kontener można zmniejszyć do minimum **1×1**.
  - **Interaktywne przenoszenie (Lift-to-Drag)**:
    - W trybie edycji uniesienie kafelka (`.is-lifted`) podąża za kursorem myszy i aktywuje pod spodem siatkę techniczną Blueprint Grid (`.blueprint-grid-layer`).
    - Wskaźnik celu upuszczenia weryfikuje wolne miejsce (zielony `✓ UPUŚĆ TUTAJ`, czerwony `✗ BRAK MIEJSCA`).
  - **Skalowanie narożnikiem**:
    - Uchwyt w prawym dolnym rogu (`.grid-resize-handle`) skaluje kafelki skokowo w jednostkach siatki.
    - Lewy górny róg jest zakotwiczony – kafelek rozszerza się wyłącznie w puste komórki obok.
  - **Zestaw parametrów biometrycznych**:
    1. Data i Godzina (`2x1`)
    2. Waga w kg (`2x1`) z automatyczną deltą
    3. Total Body Water TBW (`1x2`) z symulacją zbiornika wody
    4. Overfat / Tkanka tłuszczowa (`1x1`)
    5. Mięśnie (% / kg) (`1x1`) z dynamicznym przeliczeniem na kg
    6. Kości / Masa mineralna (% / kg) (`1x1`) z dynamicznym przeliczeniem na kg
    7. BMI (`1x1`)
    8. Kcal / BMR (`1x1`)
    9. Ketony w moczu (`2x1`) z 6-stopniowym testem paskowym (w tym stan `Brak pomiaru`)
    10. Główny Panel Trendów (`5x2`) z przełącznikiem zakładek (Pill Tabs)
    11. Kształt i Skład Ciała (`3x2`) po prawej stronie wykresu – koncentryczne fizyczne otoczki (Kości: biały rdzeń 2px + pełna kropka głowy, Mięśnie: czerwona otoczka, Tłuszcz: żółta otoczka, Woda: niebieska otoczka) z dynamicznym skalowaniem grubości 1:1
    12. Historia Pomiarów (`8x2`) z przyciskiem "+ Dodaj pomiar" otwierającym modal
  - **Reużywalny Komponent Modala (`ModalComponent`) & Rejestr Pomiarów**:
    - Lokalizacja: `frontend/src/app/components/modal/`
    - Standalone Component oparty o sygnały (`isOpen`, `title`, `subtitle`, `badge`, `closed`).
    - Pełny ekran (`100vw` x `100vh`), treść pełnej szerokości (`width: 100%`) z `scrollbar-gutter: stable`.
    - Prawa strona nagłówka: slot projekcji `[modal-actions]` (w tym przycisk `+ Nowy wpis` z auto-pobieraniem domyślnych wartości z poprzedniego pomiaru) + przycisk zamknięcia `✕` (skrót `Escape`).
    - Tryb edycji: przycisk ołówka `.table-btn-edit` w tabeli ładuje wpis i przełącza formularz w tryb `EDYCJA WPISU #...` z podświetleniem `.row-editing`.
  - **Silnik Wykresów (SVG Canvas + HTML Overlay)**:
    - **Hybrydowa konstrukcja**: Wykresy wektorowe SVG (`viewBox="0 0 1000 1000"`, `preserveAspectRatio="none"`, `vector-effect="non-scaling-stroke"`) odpowiadają za płynne krzywe Beziera i stałą grubość linii (2.5px), natomiast warstwa HTML Overlay (`left: xPct%`, `top: yPct%`) odpowiada za etykiety wartości, daty i znaczniki punktów, eliminując spłaszczanie/zwężanie czcionki `JetBrains Mono` oraz deformację punktów w owale.
    - **Pasek zakładek (Param Tabs)**: Posiada horyzontalny scroll (`overflow-x: auto`) ze schowanym scrollbarem, zapobiegając rozbijaniu się na wiele wierszy i ucinaniu wykresu przy wąskich kafelkach.
    - **Obsługa Stanu Bazowego (1 wpis)**: Punkt zostaje wyśrodkowany (50%, 50%) z pulsującym radarem, etykietą wartości, poziomą linią referencyjną `stroke-dasharray="6,6"`, zakresem referencyjnym osi Y (±10%) i znacznikiem `PUNKT BAZOWY (1 POMIAR)`.
  - **Obsługa Zerowych Statystyk (Zero State & Safe Charts)**:
    - Obiekt `EMPTY_MEASUREMENT` zabezpiecza obliczenia przed `undefined` przy pustej bazie `history() === []`.
    - Silnik wykresów renderuje dedykowany box stanu pustego (`.empty-chart-box`) dla 0 rekordów.
    - Tabele wykorzystują bloki `@empty` z informacją o braku danych.
  - **Stan reaktywny**: Wyłącznie `signal()`, `computed()` i `effect()`.

---

## 3. Rozwijanie Backendu (NestJS) & Persystencji JSON

- **Katalog**: `backend/`
- **Katalog danych**: `backend/data/` (pliki `layout.json` i `measurements.json`)
- **Główny moduł**: `backend/src/app.module.ts`
- **Architektura Modułów**:
  - `backend/src/storage/storage.service.ts`: centralny serwis obsługujący asynchroniczny odczyt/zapis plików JSON i auto-inicjalizację danymi domyślnymi.
  - `backend/src/layout/`: kontroler i serwis dla `/api/layout` (`GET`, `PUT`, `POST /reset`).
  - `backend/src/measurements/`: kontroler i serwis dla `/api/measurements` (`GET`, `POST`, `GET /:id`, `PUT /:id`, `DELETE /:id`, `POST /reset`).
- **Konwencja importów**: Ponieważ projekt działa w trybie ESM (`"type": "module"`), wszystkie importy relatywne muszą zawierać rozszerzenie `.js` w plikach `.ts`, np.:
  ```typescript
  import { StorageService } from '../storage/storage.service.js';
  import type { MeasurementRecord } from '../storage/storage.service.js';
  ```

---

## 4. Budowanie i Weryfikacja

Weryfikacja kompilacji i testów jednostkowych:

```powershell
# Testy jednostkowe
npm.cmd --prefix backend test
npm.cmd --prefix frontend test -- --watch=false

# Budowanie produkcyjne
npm.cmd --prefix backend run build
npm.cmd --prefix frontend run build
```
