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

### 3. Modularny Kwadratowy Grid i Pozycjonowanie 2D (Square Grid System) & Responsywność RWD
- **Desktop (8 Kolumn)**:
  - `grid-template-columns: repeat(8, minmax(120px, 1fr))`
  - `grid-auto-rows: 135px` (stała wysokość modułu zapobiegająca rozciąganiu wierszy)
  - `gap: var(--grid-gap)`
  - Każdy kontener posiada jawne współrzędne 2D: `col` (1-8), `row` (1+), `colSpan` i `rowSpan`.
  - Każdy kontener może być skalowany do minimum **1×1** (pojedynczy moduł siatki).
- **Tablet (4 Kolumny, 769px - 1100px)**:
  - `grid-template-columns: repeat(4, minmax(0, 1fr))` z automatycznym przepływem kart 1-kolumnowych, 2-kolumnowych i pełnoszerokościowych 4-kolumnowych.
- **Mobile / Smartfony (Maksymalnie 2 Klocki Szerokości, <= 768px)**:
  - `grid-template-columns: repeat(2, minmax(0, 1fr)) !important`
  - `grid-auto-rows: minmax(125px, auto) !important` oraz `gap: 8px !important`
  - **Kafelki pojedyncze (1 klocek szerokości - `span 1`)**: TBW, Overfat, Mięśnie, Kości, BMI, Kcal, Dieta, Alkohol.
  - **Kafelki podwójne / pełnoszerokościowe (2 klocki szerokości - `span 2`)**: Data i Godzina, Waga Ciała, Ketony w moczu, Wykres Trendu (`mainChart`), Kształt Ciała (`bodyShape`), Historia Pomiarów (`history`).
  - **Dynamiczne Viewporty i Safe Area**: Obsługa jednostki `100dvh`, deklaracja `viewport-fit=cover` oraz bezpieczny dolny padding `calc(80px + env(safe-area-inset-bottom, 0px))` zapobiegający ucinaniu dolnych kontenerów przez pasek nawigacyjny przeglądarki mobilnej.
  - Optymalizacja dotykowa (touch-friendly), responsywna górna belka (Top Bar), mobilne modale oraz czytelne wykresy bez rozciągania.

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
3. **Nawodnienie komórkowe (% / L)** (`colSpan: 1, rowSpan: 2`) ze wskaźnikiem normy 55-65%
4. **Overfat (Tkanka tłuszczowa %)** (`colSpan: 1, rowSpan: 1`) z oceną normy bazującą na płci ustawionej w profilu użytkownika
5. **Mięśnie (% / kg)** (`colSpan: 1, rowSpan: 1`) z przeliczeniem na kg
6. **Kości (Minerały % / kg)** (`colSpan: 1, rowSpan: 1`) z przeliczeniem na kg
7. **BMI** (`colSpan: 1, rowSpan: 1`)
8. **Kcal (BMR)** (`colSpan: 1, rowSpan: 1`)
9. **Ketony w moczu (mmol/L)** (`colSpan: 2, rowSpan: 1`) z wykresem trendu w czasie oraz poziomym paskiem stanu na dziś z wycentrowaną przybliżoną wartością
10. **Utrzymanie Diety** (`colSpan: 1, rowSpan: 1`) – minimalistyczny wskaźnik ostatniego pomiaru (Keto, Low Carb, Lekka, Zła)
11. **Spożycie Alkoholu** (`colSpan: 2, rowSpan: 1`) – licznik dni od ostatniego spożycia alkoholu wraz z informacją o zarejestrowanym poziomie
12. **Główny Panel Wykresów Trendu** (`colSpan: 5, rowSpan: 2`) z przełącznikiem parametrów (Pill Tabs)
13. **Wizualizacja Kształtu i Składu Ciała** (`colSpan: 3, rowSpan: 2`) – poziomy pasek kompozycji oraz wyśrodkowany, powiększony przelicznik masy na kilogramy (Kości, Mięśnie, Tłuszcz, Woda)
14. **Historia i Rejestr Pomiarów** (`colSpan: 8, rowSpan: 2`) z możliwością wyboru rekordu i przyciskiem otwierania pełnego rejestru w Modalu

### 6. Reużywalny Pełnoekranowy Komponent Modala (`ModalComponent`) & Rejestr Pomiarów
- **Ścieżka**: `frontend/src/app/components/modal/modal.ts` (oraz `modal.html`, `modal.css`).
- **Standard**: Standalone Component z sygnałami (`isOpen = input<boolean>()`, `title = input<string>()`, `subtitle = input<string>()`, `badge = input<string>()`, `closed = output<void>()`).
- **Układ**: Pełny ekran (`100vw` x `100vh` / `100dvh`), treść o pełnej szerokości (`width: 100%`) z `scrollbar-gutter: stable`, zapobiegającym nachodzeniu na pasek przewijania.
- **Nagłówek i Responsywność Mobilna**:
  - Tytuł i wskaźnik po lewej, slot projekcji `<ng-content select="[modal-actions]" />` na przyciski akcji (np. `+ Nowy wpis`, zwijanie formularza, zapis/aktualizacja) oraz przycisk zamknięcia `✕` (obsługa klawisza `Escape` przez `@HostListener`).
  - **RWD na komórkach (`<= 768px`)**: Przyciski akcji w nagłówku modala (`[modal-actions]`) ukrywają etykiety tekstowe i wyświetlają **wyłącznie ikony** w kwadratowych, dotykowych przyciskach (`34×34px`), co zapobiega rozpychaniu nagłówka na małych ekranach.
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

### 8. Uwierzytelnianie Google OAuth, Izolacja JSON Per-User, MongoDB & Profil Użytkownika
- **Struktura Trwałego Magazynu Danych (MongoDB Atlas + Fallback JSON)**:
  - **Tryb Chmurowy (MongoDB)**: Aktywowany po podaniu `MONGODB_URI` w `.env` lub w panelu Render.com.
    - Kolekcje: `users`, `layouts`, `measurements` z dokumentami JSON per-user (`_id: safeId`).
    - Bezpieczeństwo: Wymuszone szyfrowanie TLS/SSL, rygorystyczna sanityzacja identyfikatora użytkownika (`sanitizeUserId()`) zabezpieczająca przed NoSQL injection, automatyczne maskowanie haseł/sekretów w logach, connection pooling i bezpieczne zamykanie połączenia (`onModuleDestroy`).
    - **Auto-migracja**: Przy pierwszym podłączeniu usera do bazy MongoDB, jeśli w bazie nie ma jego rekordu, ale na dysku istnieją lokalne pliki JSON (`backend/data/users/<userId>/`), system automatycznie migruje je do kolekcji MongoDB.
  - **Tryb Lokalny (Fallback JSON)**: Gdy zmienna `MONGODB_URI` nie jest podana, dane zapisywane są w dedykowanych podfolderach `backend/data/users/<userId>/` (`user.json`, `layout.json`, `measurements.json`). Zapewnia to 100% sprawność testów jednostkowych i pracy offline.
  - Domyślny profil gościa / bez logowania: `guest` (zasilany danymi demonstracyjnymi).
  - **Zasada Zero Statystyk**: Każde nowo zarejestrowane konto Google otrzymuje **pustą tablicę pomiarów (`[]`)** w bazie/pliku `measurements.json` – brak sztucznych danych dla zalogowanych użytkowników.
  - **Sonda Zdrowia**: Endpoint `/api/health` raportuje aktualny stan i typ magazynu (`storage: { type: 'mongodb' | 'file-json', connected: boolean, database?: string }`).
- **Konfiguracja Środowiskowa (.env)**:
  - Zmienne `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MONGODB_URI`, `MONGODB_DB_NAME` przechowywane są w pliku `.env` w głównym katalogu.
  - Backend wczytuje je automatycznie przez `process.loadEnvFile()` i wystawia `GET /api/auth/config` bez ujawniania sekretów.
  - Wzorzec konfiguracji dostępny w pliku `.env.example`.
  - Brak wzmianek o `.env` lub formularzy wklejania kluczy w interfejsie użytkownika.
- **Backend DTO & Moduł Uwierzytelniania**:
  - `UserDto` (`backend/src/auth/dto/user.dto.ts`): `id`, `sub`, `email`, `name`, `givenName`, `familyName`, `emailVerified`, `picture`, `locale`, `gender`, `provider`, `createdAt`, `lastLoginAt`, `googleRawClaims`.
  - `AuthService` & `AuthController` (`/api/auth/google`, `/api/auth/config`, `/api/auth/me`).
  - Przekazywanie kontekstu użytkownika nagłówkiem HTTP `x-user-id` we wszystkich serwisach biometrii i layoutu.
- **Frontend Uwierzytelnianie, Top Bar & Modal Profilu**:
  - `AuthService` (`frontend/src/app/services/auth.service.ts`) zarządzający stanem `currentUser`, `isLoggedIn`, `isGoogleConfigured` i auto-synchronizacją.
  - Przycisk profilu w prawym górnym rogu górnej belki (`top-bar`): wyświetla awatar Google i imię użytkownika lub przycisk logowania Google.
  - Pełnoekranowy modal:
    - **Dla niezalogowanego**: Oficjalne logowanie Google Identity Services (GIS).
    - **Dla zalogowanego ("Profil użytkownika")**: Karta tożsamości z awatarem, przyciskiem **Wyloguj bezpośrednio pod awatarem**, imieniem i e-mailem, interaktywnym selektorem płci biologicznej (`♂ Mężczyzna` / `♀ Kobieta` – zasilającym normy biometrii) oraz siatką bezpiecznych parametrów użytkownika (Imię, Nazwisko, E-mail, Język, Data rejestracji, Ostatnie logowanie).
    - **Zasada Bezpieczeństwa**: Brak surowych zrzutów tokenów JWT / parametrów technicznych w interfejsie użytkownika.

### 9. Wdrożenie Produkcyjne na Render.com & Dynamiczny Resolver API
- **Render Blueprint (`render.yaml`)**:
  - Projekt zawiera zadeklarowaną infrastrukturę IaC w głównym pliku `render.yaml`.
  - **Backend Web Service (`body-dashboard-backend`)**:
    - `rootDir: backend`
    - `buildCommand: npm install --include=dev && npm run build` (flaga `--include=dev` zapewnia dostępność `@nestjs/cli` w trakcie budowania)
    - `startCommand: npm run start:prod`
    - Sekrety OAuth (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) oraz baza danych (`MONGODB_URI`) oznaczone jako `sync: false` – wartości podawane są wyłącznie w panelu Render, co chroni je w publicznym repozytorium.
    - Zmienna `MONGODB_DB_NAME: body_dashboard` predefiniowana w szablonie.
  - **Frontend Static Site (`body-dashboard-frontend`)**:
    - `rootDir: frontend`
    - `buildCommand: npm install --include=dev && npm run build`
    - `staticPublishPath: dist/frontend/browser`
    - Reguła Rewrite `/* -> /index.html` gwarantująca bezbłędny routing SPA.
- **Wymóg Wersji Node.js (Node 22)**:
  - Angular v22 wymaga Node.js 22. Obie usługi mają ustawioną zmienną `NODE_VERSION: 22` w `render.yaml` oraz plik `.node-version`.
- **Dynamiczny Resolver API (`api.config.ts`)**:
  - Funkcja `getApiBaseUrl()` w `frontend/src/app/services/api.config.ts` automatycznie rozpoznaje środowisko:
    - `localhost` / `127.0.0.1` ➔ `http://localhost:3000`
    - Domeny Render (`*-frontend.onrender.com`) ➔ `https://*-backend.onrender.com`
    - Opcjonalne nadpisanie przez `localStorage.getItem('BODY_DASHBOARD_API_URL')`.

---

## 🚀 Standardy Uruchamiania i Zarządzania

1. **Uruchamianie całości**:
   - Komenda: `node start` (lub `npm start`) wywoływana z katalogu głównego.
   - Launcher automatycznie otwiera Dashboard w przeglądarce (`http://localhost:4000`) i startuje oba serwisy w tle.

2. **Środowisko Windows / PowerShell**:
   - W skryptach i komendach terminalowych należy używać `npm.cmd` oraz `npx.cmd` ze względu na politykę bezpieczeństwa PowerShell (`ExecutionPolicy`).

3. **Porty sieciowe**:
   - **4000**: Launcher Dashboard & SSE streaming (Lokalnie)
   - **4200**: Angular Frontend Client (Lokalnie)
   - **3000 / 10000**: NestJS Backend API (3000 lokalnie, 10000 na Renderze)

---

## 💻 Standardy Kodowania

### Frontend (Angular)
- **Komponenty**: Wyłącznie Standalone Components (brak `NgModule`).
- **Stan reaktywny**: Używaj `signal()`, `computed()`, `effect()` zamiast klasycznych `BehaviorSubject`.
- **Serwisy Danych**:
  - `AuthService`: zarządza kontami, uwierzytelnianiem Google i modalem logowania.
  - `DashboardLayoutService`: zarządza siatką, trybem edycji i synchronizacją z `/api/layout` per user (`x-user-id`).
  - `MeasurementsService`: zarządza danymi biometrycznymi i synchronizacją z `/api/measurements` per user (`x-user-id`).
- **Wykresy i Wizualizacje**: Wykresy wektorowe SVG z krzywymi Beziera i gradientami (brak ciężkich zewnętrznych bibliotek).
- **Komunikacja HTTP**: Konfiguracja przez `provideHttpClient()` w `app.config.ts`, dynamiczny adres API z `getApiBaseUrl()`, obsługa błędów za pomocą operatora `catchError` z biblioteki RxJS.
- **CORS**: NestJS jest skonfigurowany pod kątem zapytań z dowolnego źródła (`origin: '*'`).

### Backend (NestJS)
- **Moduły i importy**: Projekt korzysta z ESM (`"type": "module"`), importy relatywne w TypeScript muszą posiadać rozszerzenie `.js` (np. `import { AppModule } from './app.module.js'`).
- **Persystencja JSON**:
  - Dane przechowywane są w podfolderach `backend/data/users/<userId>/` (`user.json`, `layout.json`, `measurements.json`).
  - `StorageService` automatycznie tworzy katalog usera i inicjalizuje pliki. Nowi użytkownicy Google startują z pustą tablicą pomiarów (`[]`).
- **Dekoratory i Isolated Modules**: Przy wstrzykiwaniu obiektów w `@Body()` należy stosować odpowiednie DTO lub `any` i importować interfejsy z `import type`, aby uniknąć błędów metadanych w trybie ESM (`TS1272`).
- **Health Checks**: Każdy nowy kluczowy serwis powinien być uwzględniony w sondzie `/api/health`.
- **CORS & Nasłuchiwanie**: W `main.ts` zawsze musi być włączony `app.enableCors()` oraz nasłuchiwanie na `await app.listen(port, '0.0.0.0')`.

### Launcher
- **Zero zewnętrznych zależności**: Launcher opiera się na wbudowanych modułach Node.js (`node:http`, `node:child_process`, `node:fs`, `node:events`).
- **Graceful Shutdown**: Launcher zamyka procesy potomne na Windows przez `taskkill /pid <PID> /T /F`.


