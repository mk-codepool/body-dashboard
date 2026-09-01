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
│   │   ├── services/      # Serwisy: DashboardLayoutService, MeasurementsService
│   │   └── dashboard/     # Główny kontener Modularnego Grida Biometrii
│   └── package.json       # Port: 4200
├── backend/               # Aplikacja NestJS (REST API)
│   ├── data/              # Trwałe pliki JSON (layout.json, measurements.json)
│   ├── src/
│   │   ├── storage/       # StorageService - obsługa plików JSON z auto-inicjalizacją
│   │   ├── layout/        # LayoutController, LayoutService (/api/layout)
│   │   ├── measurements/  # MeasurementsController, MeasurementsService (/api/measurements)
│   │   ├── app.controller.ts  # Sondy /api/health i /api/info
│   │   └── main.ts        # Bootstrap z CORS i portem 3000
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

### 4. Interaktywny Tryb Edycji i Persystencja JSON (Lift-to-Drag, Resize & JSON Sync)
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
- **Trwałość JSON i Synchronizacja API**:
  - Układ użytkownika (`col`, `row`, `colSpan`, `rowSpan`) jest automatycznie zapisywany przez backend w pliku `backend/data/layout.json` poprzez endpoint `PUT /api/layout`.
  - Frontend utrzymuje kopię w `localStorage` jako natychmiastowy cache i fallback w przypadku braku połączenia.
  - Przycisk "Resetuj" wywołuje `POST /api/layout/reset` przywracając stan fabryczny w pliku JSON oraz w widoku.

### 5. Główne Parametry Biometrii Ciała i Źródło Danych JSON
Wszystkie rekordy pomiarowe pobierane i utrwalane są w pliku `backend/data/measurements.json` poprzez serwis `MeasurementsService` i endpointy `/api/measurements`:
1. **Data i Godzina pomiaru** (`colSpan: 2, rowSpan: 1`)
2. **Waga (kg)** (`colSpan: 2, rowSpan: 1`) z trendem vs poprzedni pomiar
3. **Total Body Water (TBW % / L)** (`colSpan: 1, rowSpan: 2`) ze zbiornikiem poziomu
4. **Overfat (Tkanka tłuszczowa %)** (`colSpan: 1, rowSpan: 1`) z zakresem normy
5. **Mięśnie (% / kg)** (`colSpan: 1, rowSpan: 1`) z przeliczeniem na kg
6. **Kości (Minerały % / kg)** (`colSpan: 1, rowSpan: 1`) z przeliczeniem na kg
7. **BMI** (`colSpan: 1, rowSpan: 1`)
8. **Kcal (BMR)** (`colSpan: 1, rowSpan: 1`)
9. **Ketony w moczu (mmol/L)** (`colSpan: 2, rowSpan: 1`) z 6-stopniowym selektorem (w tym stan `Brak pomiaru` / `none`)
10. **Główny Panel Wykresów Trendu** (`colSpan: 5, rowSpan: 2`) z przełącznikiem parametrów (Pill Tabs)
11. **Wizualizacja Sylwetki i Składu Ciała** (`colSpan: 3, rowSpan: 2`) po prawej stronie wykresu – wielowarstwowy wektorowy model koncentrycznych otoczek (Painter's Algorithm):
    - ⚪ **Kości (Minerały)**: Cienki biały rdzeń szkieletu (`2.0px`, `#ffffff`) z pełną, jednolitą kropką głowy w środku (brak wewnętrznych pustych warstw).
    - 🔴 **Mięśnie & Białko**: Czerwona otoczka (`#ef4444`) otaczająca szkielet kości, o grubości proporcjonalnej do masy mięśniowej.
    - 🟡 **Tłuszcz (Fat)**: Żółta otoczka (`#f59e0b`) otaczająca warstwę mięśni, o grubości proporcjonalnej do poziomu tkanki tłuszczowej.
    - 🔵 **Woda (TBW)**: Niebieska zewnętrzna otoczka (`#06b6d4`) otaczająca całą sylwetkę, o grubości proporcjonalnej do nawodnienia.
    - Dynamiczne skalowanie 1:1 grubości fizycznych otoczek $\Delta T_i$ oraz dwustronny interaktywny hover łączący sylwetkę z kafelkami składowych.
12. **Historia i Rejestr Pomiarów** (`colSpan: 8, rowSpan: 2`) z możliwością wyboru rekordu i przyciskiem otwierania pełnego rejestru w Modalu

### 6. Reużywalny Pełnoekranowy Komponent Modala (`ModalComponent`) & Rejestr Pomiarów
- **Ścieżka**: `frontend/src/app/components/modal/modal.ts` (oraz `modal.html`, `modal.css`).
- **Standard**: Standalone Component z sygnałami (`isOpen = input<boolean>()`, `title = input<string>()`, `subtitle = input<string>()`, `badge = input<string>()`, `closed = output<void>()`).
- **Układ**: Pełny ekran (`100vw` x `100vh`), treść o pełnej szerokości (`width: 100%`) z `scrollbar-gutter: stable`, zapobiegającym nachodzeniu na pasek przewijania.
- **Nagłówek**: Tytuł i wskaźnik po lewej, slot projekcji `<ng-content select="[modal-actions]" />` na przyciski akcji (np. `+ Nowy wpis`, zwijanie formularza, zapis/aktualizacja) oraz przycisk zamknięcia `✕` (obsługa klawisza `Escape` przez `@HostListener`).
- **Obsługa Edycji i Nowego Wpisu**:
  - Dedykowany przycisk edycji (ikona ołówka `.table-btn-edit`) w tabeli modala ładuje wybrany rekord i przełącza formularz w tryb `EDYCJA WPISU #...` z podświetleniem wiersza `.row-editing`.
  - Przycisk `+ Nowy wpis` w nagłówku modala resetuje formularz, przełącza z trybu edycji na nowy wpis oraz automatycznie pobiera wartości startowe z **poprzedniego (najnowszego) pomiaru**.

### 7. Responsywny Silnik Wykresów Biometrii (SVG Canvas + HTML Overlay)
- **Architektura Hybrydowa (Brak Zniekształceń Typografii)**:
  - **SVG Canvas**: Wektorowe tło, krzywe Beziera i linie pomocnicze renderowane w układzie współrzędnych 1000×1000 z `preserveAspectRatio="none"` i `vector-effect="non-scaling-stroke"` (gwarantuje stałą grubość linii 2.5px niezależnie od skali).
  - **HTML Overlay**: Wszystkie etykiety wartości, daty osi X, etykiety min/mid/max osi Y oraz pulsujące punkty są pozycjonowane procentowo w HTML (`left: xPct%`, `top: yPct%`). Eliminuje to wszelkie spłaszczanie, zwężanie lub rozciąganie czcionek `JetBrains Mono` i zniekształcanie okrągłych punktów w owale przy dowolnej szerokości kafelka (1–8 kolumn).
- **Elastyczność i Pasek Zakładek (Param Tabs)**:
  - Pasek zakładek parametrów biometrii (`.param-tabs-container`) posiada płynne przewijanie poziome `overflow-x: auto` i stałą wysokość – nie rozbija się na wiele wierszy przy wąskich kafelkach i nie wypycha wykresu poza widok.
  - Kontener wykresu korzysta z `flex: 1` i dynamicznie dopasowuje się do dostępnej przestrzeni.
- **Obsługa Stanów Granicznych (Zero State & Baseline State)**:
  - **0 pomiarów (Zero State)**: Bezpieczny obiekt `EMPTY_MEASUREMENT` oraz placeholder `.empty-chart-box` z zachętą do dodania pierwszego wpisu.
  - **1 pomiar (Stan Bazowy)**: Pojedynczy punkt jest estetycznie wyśrodkowany (50%, 50%) z pulsującym radarem, wartością w dymku, poziomą linią referencyjną `stroke-dasharray="6,6"`, automatyczną osią referencyjną Y (±10%) oraz wskaźnikiem `PUNKT BAZOWY (1 POMIAR)`.
  - **2+ pomiary (Trend)**: Płynna krzywa sklejania sześciennego Beziera, wypełnienie gradientowe i kalkulacja zmiany `delta` (7D).

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
- **Serwisy Danych**:
  - `DashboardLayoutService`: zarządza siatką, trybem edycji i synchronizacją z `/api/layout`.
  - `MeasurementsService`: zarządza danymi biometrycznymi i synchronizacją z `/api/measurements` (w tym pełna obsługa dodawania, usuwania i pustej bazy `[]`).
- **Wykresy i Wizualizacje**: Wykresy wektorowe SVG z krzywymi Beziera i gradientami (brak ciężkich zewnętrznych bibliotek).
- **Komunikacja HTTP**: Konfiguracja przez `provideHttpClient()` w `app.config.ts`, obsługa błędów za pomocą operatora `catchError` z biblioteki RxJS.
- **CORS**: NestJS jest skonfigurowany pod kątem zapytań z portu `4200` i `4000`.

### Backend (NestJS)
- **Moduły i importy**: Projekt korzysta z ESM (`"type": "module"`), importy relatywne w TypeScript muszą posiadać rozszerzenie `.js` (np. `import { AppModule } from './app.module.js'`).
- **Persystencja JSON**:
  - Dane przechowywane są w plikach JSON w `backend/data/` (`layout.json`, `measurements.json`).
  - `StorageService` automatycznie tworzy katalog i inicjalizuje pliki danymi domyślnymi, jeśli jeszcze nie istnieją.
- **Dekoratory i Isolated Modules**: Przy wstrzykiwaniu obiektów w `@Body()` należy stosować odpowiednie DTO lub `any` i importować interfejsy z `import type`, aby uniknąć błędów metadanych w trybie ESM (`TS1272`).
- **Health Checks**: Każdy nowy kluczowy serwis powinien być uwzględniony w sondzie `/api/health`.
- **CORS**: W `main.ts` zawsze musi być włączony `app.enableCors()`.

### Launcher
- **Zero zewnętrznych zależności**: Launcher opiera się na wbudowanych modułach Node.js (`node:http`, `node:child_process`, `node:fs`, `node:events`).
- **Graceful Shutdown**: Launcher zamyka procesy potomne na Windows przez `taskkill /pid <PID> /T /F`.
