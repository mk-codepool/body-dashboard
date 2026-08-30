# Body Dashboard - Instrukcje i Wytyczne Deweloperskie

Plik zawiera reguły i wytyczne architektoniczne dla agentów AI oraz deweloperów pracujących w repozytorium **body-dashboard**.

---

## 🏗️ Architektura Projektu

Projekt podzielony jest na 3 niezależne moduły oraz wspólny punkt startowy:

```text
body-dashboard/
├── start.js               # Główny skrypt startowy uruchamiający Launcher
├── package.json           # Skrypty root
├── AGENTS.md              # Niniejsze instrukcje deweloperskie
├── frontend/              # Aplikacja Angular v22 (SPA)
│   ├── src/app/
│   │   ├── app.ts         # Root component z <router-outlet /> i górną belką
│   │   ├── app.routes.ts  # Konfiguracja routingu (trasa domyślna -> Dashboard)
│   │   └── dashboard/     # Główny kontener Modularnego Grida Biometrii
│   └── package.json       # Port: 4200
├── backend/               # Aplikacja NestJS (REST API)
│   ├── src/               # Kontrolery, serwisy, sondy health check
│   └── package.json       # Port: 3000
└── launcher/              # Moduł Launchera i Dashboardu
    ├── src/
    │   ├── index.js           # Orkiestrator i auto-otwieranie przeglądarki
    │   ├── process-manager.js # Nadzór nad procesami Angular i NestJS
    │   ├── dashboard-server.js# Serwer HTTP i streaming logów SSE
    │   ├── cli-dashboard.js   # Konsolowy Dashboard z obsługą klawiszy
    │   └── public/index.html  # Nowoczesny Web Dashboard (Dark UI)
    └── package.json       # Port: 4000
```

---

## 🎨 Standardy UI/UX i Modularnego Grida

### 1. Minimalistyczny Ciemny Motyw (Dark Minimalist)
- **Tło bazowe**: `#08090d`, panele z efektem glassmorphism `rgba(18, 21, 31, 0.7)` i filtrem `backdrop-filter: blur(12px)`.
- **Typografia**: `Inter` dla interfejsu oraz `JetBrains Mono` dla wartości liczbowych, dat i metryk.
- **Krawędzie i poświaty**: Subtelne obramowania `rgba(255, 255, 255, 0.08)` z neonowymi akcentami cyan (`#06b6d4`), emerald (`#10b981`), amber (`#f59e0b`), purple (`#a855f7`) i rose (`#f43f5e`).

### 2. Górna Belka (Top Bar)
- Wysokość stała: `56px`.
- Zawiera logo "BODY DASHBOARD", wskaźnik stanu systemu ("SYSTEM ONLINE") oraz zegar czasu rzeczywistego oparty o Signals.
- Główna przestrzeń pod belką zajmuje 100% pozostałej wysokości (`height: calc(100vh - 56px)`).

### 3. Modularny Kwadratowy Grid i Pozycjonowanie 2D (Square Grid System)
- Siatka CSS Grid oparta na modułach kwadratowych:
  - `grid-template-columns: repeat(8, minmax(120px, 1fr))`
  - `grid-auto-rows: 135px` (stała wysokość modułu zapobiegająca rozciąganiu wierszy)
  - `gap: var(--grid-gap)`
- Każdy kontener posiada jawne współrzędne 2D: `col` (1-8), `row` (1+), `colSpan` i `rowSpan`.
- Każdy kontener może być skalowany do minimum **1×1** (pojedynczy moduł siatki).

### 4. Interaktywny Tryb Edycji (Lift-to-Drag & Resize)
- **Aktywacja**: Przycisk "Dostosuj pulpit" w prawej części górnej belki (`app.html` / `app.ts`) zasilany przez `DashboardLayoutService`.
- **Siatka Blueprint w tle**: W momencie edycji i uniesienia kafelka w tle pojawia się odseparowana siatka techniczna kwadratów (`.blueprint-grid-layer`, `position: absolute`).
- **Uniesienie i upuszczenie (Lift-to-Drag)**:
  - Chwycenie belki nagłówka kafelka unosi go ponad pulpit (`.is-lifted`, cień, neonowa poświata cyan).
  - Algorytm dynamicznie sprawdza dostępność miejsca (`canPlaceWidget`) i renderuje wskaźnik (`✓ UPUŚĆ TUTAJ` / `✗ BRAK MIEJSCA`).
  - Kafelki można umieszczać wyłącznie tam, gdzie jest odpowiednio dużo wolnego miejsca.
- **Skokowe skalowanie narożnikiem**:
  - Uchwyt w prawym dolnym rogu (`.grid-resize-handle`, 32×32px) skaluje kontener skokowo w jednostkach siatki.
  - Lewy górny róg kontenera jest sztywno zakotwiczony.
  - Kafelek rozszerza się wyłącznie wtedy, gdy obok znajdują się puste komórki siatki.
- **Trwałość**: Układ użytkownika jest automatycznie synchronizowany z `localStorage` (`body_dashboard_layout_v3`), a przycisk "Resetuj" przywraca układ fabryczny.

### 5. Główne Parametry Biometrii Ciała
Zestaw mierzonych i prezentowanych parametrów:
1. **Data i Godzina pomiaru** (`colSpan: 2, rowSpan: 1`)
2. **Waga (kg)** (`colSpan: 2, rowSpan: 1`) z trendem vs poprzedni pomiar
3. **Total Body Water (TBW % / L)** (`colSpan: 1, rowSpan: 2`) ze zbiornikiem poziomu
4. **Overfat (Tkanka tłuszczowa %)** (`colSpan: 1, rowSpan: 1`) z zakresem normy
5. **Mięśnie (kg / %)** (`colSpan: 1, rowSpan: 1`)
6. **Kości (Minerały kg)** (`colSpan: 1, rowSpan: 1`)
7. **BMI** (`colSpan: 1, rowSpan: 1`)
8. **Kcal (BMR)** (`colSpan: 1, rowSpan: 1`)
9. **Ketony w moczu (mmol/L)** (`colSpan: 2, rowSpan: 1`) z 5-stopniowym paskiem barwnym
10. **Główny Panel Wykresów Trendu** (`colSpan: 5, rowSpan: 2`) z przełącznikiem parametrów (Pill Tabs)
11. **Wizualizacja Sylwetki i Składu Ciała** (`colSpan: 3, rowSpan: 2`) po prawej stronie wykresu
12. **Historia i Rejestr Pomiarów** (`colSpan: 8, rowSpan: 2`) z możliwością wyboru rekordu

---

## 🚀 Standardy Uruchamiania i Zarządzania

1. **Uruchamianie całości**:
   - Komenda: `node start` (lub `npm start`) wywoływana z katalogu głównego.
   - Launcher automatycznie otwiera Dashboard w przeglądarce (`http://localhost:4000`) i startuje oba serwisy w tle.

2. **Środowisko Windows / PowerShell**:
   - W skryptach i komendach terminalowych należy używać `npm.cmd` oraz `npx.cmd` ze względu na politykę bezpieczeństwa PowerShell (`ExecutionPolicy`).

3. **Porty sieciowe**:
   - **4000**: Launcher Dashboard & SSE streaming
   - **4200**: Angular Frontend Client
   - **3000**: NestJS Backend API

---

## 💻 Standardy Kodowania

### Frontend (Angular)
- **Komponenty**: Wyłącznie Standalone Components (brak `NgModule`).
- **Stan reaktywny**: Używaj `signal()`, `computed()`, `effect()` zamiast klasycznych `BehaviorSubject`.
- **Wykresy i Wizualizacje**: Wykresy wektorowe SVG z krzywymi Beziera i gradientami (brak ciężkich zewnętrznych bibliotek).
- **Komunikacja HTTP**: Konfiguracja przez `provideHttpClient()` w `app.config.ts`.
- **CORS**: NestJS jest skonfigurowany pod kątem zapytań z portu `4200` i `4000`.

### Backend (NestJS)
- **Moduły i importy**: Projekt korzysta z ESM (`"type": "module"`), importy relatywne w TypeScript muszą posiadać rozszerzenie `.js` (np. `import { AppModule } from './app.module.js'`).
- **Health Checks**: Każdy nowy kluczowy serwis powinien być uwzględniony w sondzie `/api/health`.
- **CORS**: W `main.ts` zawsze musi być włączony `app.enableCors()`.

### Launcher
- **Zero zewnętrznych zależności**: Launcher opiera się na wbudowanych modułach Node.js (`node:http`, `node:child_process`, `node:fs`, `node:events`).
- **Graceful Shutdown**: Launcher zamyka procesy potomne na Windows przez `taskkill /pid <PID> /T /F`.

