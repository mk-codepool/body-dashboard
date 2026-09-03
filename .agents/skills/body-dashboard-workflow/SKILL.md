---
name: body-dashboard-workflow
description: >-
  Przewodnik i instrukcja pracy z projektem body-dashboard. Używaj przy uruchamianiu,
  rozwijaniu endpointów NestJS, autoryzacji Google, komponentów Angular, modularnego grida biometrii, persystencji JSON per-user oraz rozbudowie launchera.
---

# Workflow Projektu Body Dashboard

Niniejszy skill zawiera procedury i instrukcje krok po kroku dotyczące pracy ze stosem technologicznym projektu:
- **Frontend**: Angular 22 (Standalone + Signals, Dark Minimalist Grid System, Google OAuth GIS, Dynamic API Resolver, RxJS HttpClient)
- **Backend**: NestJS (ESM + TypeScript, JSON Data Storage per-user, Google JWT Decoding, .env Config)
- **Wdrożenie Produkcyjne**: Render.com Blueprint (`render.yaml`) – Web Service (NestJS) + Static Site (Angular), bezpieczne sekrety `sync: false`
- **Launcher**: Wbudowany menedżer procesów z Web Dashboardem i SSE (wyłącznie środowisko deweloperskie)

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

## 2. Konfiguracja Środowiskowa (.env) & Google OAuth

1. **Plik `.env` w głównym katalogu**:
   - `GOOGLE_CLIENT_ID`: identyfikator klienta aplikacji internetowej z Google Cloud Console (`*.apps.googleusercontent.com`).
   - `GOOGLE_CLIENT_SECRET`: sekret klienta OAuth.
   - `MONGODB_URI`: ciąg połączeniowy do MongoDB Atlas (`mongodb+srv://...`). W przypadku braku backend automatycznie używa lokalnych plików JSON w `data/users/`.
   - `MONGODB_DB_NAME`: nazwa bazy (domyślnie `body_dashboard`).
   - `PORT`: port backendu (domyślnie `3000` lokalnie, `10000` na Renderze).
   - Szablon referencyjny: `.env.example`.
2. **Backend**:
   - Automatycznie wczytuje `.env` przy starcie za pomocą natywnego mechanizmu Node.js `process.loadEnvFile()`.
   - Udostępnia endpoint `GET /api/auth/config` dostarczający Client ID frontendowi.
3. **Frontend**:
   - `AuthService` dynamicznie pobiera konfigurację i inicjalizuje Google Identity Services (GIS).
   - Brak jakichkolwiek widocznych wyciągów `.env` lub formularzy wklejania kluczy w UI.

---

## 3. Rozwijanie Frontendu (Angular) & Modularnego Grida 2D

- **Katalog**: `frontend/`
- **Root komponent**: `frontend/src/app/app.ts` (górna belka z brandingiem, wskaźnikiem stanu serwera `ApiHealthService`, przyciskiem "Dostosuj pulpit", przyciskiem profilu Google, zegarem czasu rzeczywistego i `<router-outlet />`).
- **Dynamiczny Resolver API (`frontend/src/app/services/api.config.ts`)**:
  - `getApiBaseUrl()`: automatycznie rozpoznaje środowisko.
  - Lokalnie (`localhost` / `127.0.0.1`) ➔ `http://localhost:3000`.
  - Na Renderze (`body-dashboard.onrender.com` / `*-frontend.onrender.com`) ➔ `https://*-backend.onrender.com`.
  - Możliwość nadpisania przez `localStorage.getItem('BODY_DASHBOARD_API_URL')`.
- **Serwisy Danych**:
  - `frontend/src/app/services/auth.service.ts`: zarządzanie stanem uwierzytelnienia (`currentUser`, `isLoggedIn`), integracja z Google OAuth (GIS), persystencja w `localStorage`.
  - `frontend/src/app/services/dashboard-layout.service.ts`: reaktywne pozycjonowanie 2D, tryb edycji, sprawdzanie kolizji `canPlaceWidget`, auto-sync z `PUT /api/layout` z nagłówkiem `x-user-id`.
  - `frontend/src/app/services/measurements.service.ts`: natychmiastowy odczyt i zapis w `localStorage` per-user (`body_dashboard_measurements_v1_${userId}`), brak opóźnienia przy starcie (0 ms), odporność na rozruch kontenera Render za pomocą `retry({ count: 3, delay: 2500 })`.
  - `frontend/src/app/services/pwa.service.ts`: obsługa zdarzenia `beforeinstallprompt`, instalacja na pulpicie (`installApp()`), stan instalacji `isInstalled`, tryb standalone oraz wsparcie dla iOS Safari.
  - `frontend/src/app/services/api-health.service.ts`: pre-warming backendu przy starcie, wykrywanie wybudzania serwera Render (`status: 'waking_up'`), pomiar czasu odpowiedzi (ping ms) oraz podtrzymywanie keep-alive co 10 min.
  - `frontend/src/app/services/backup.service.ts`: eksport i import danych JSON, inspekcja plików, walidacja oraz bezpieczne czyszczenie pomiarów.
- **Główny kontener widoku**: `frontend/src/app/dashboard/dashboard.ts`

- **Architektura PWA & Rozwiązywanie Cold-Startu na Renderze**:
  - **Ikona aplikacji**: `frontend/src/app/assets/favicon.ico` propagowana do `public/icons/` (`icon-192x192.png`, `icon-512x512.png`, `icon-maskable.png`, `apple-touch-icon.png`).
  - **Manifest**: `frontend/public/manifest.webmanifest` (`theme_color: #08090d`, `display: standalone`).
  - **Service Worker**: `frontend/public/sw.js` realizujący pre-cache powłoki aplikacji (App Shell), natychmiastowe ładowanie offline oraz transparentne omijanie endpointów `/api/*`.
  - **Górna belka (Top Bar)**: Branding z logo i interaktywną plakietką stanu (`ONLINE` / `⚡ WYBUDZANIE SERWERA` / `OFFLINE`).

- **Konwencje Grida 2D, Responsywności RWD i Parametrów**:
  - **Siatka Desktop**: 8 kolumn `repeat(8, minmax(120px, 1fr))`, stała wysokość wiersza `135px`.
  - **Siatka Mobile (<= 768px)**: Maksymalnie 2 kolumny `repeat(2, minmax(0, 1fr)) !important`, `grid-auto-rows: minmax(125px, auto) !important`, `gap: 8px !important`. Kafelki 1-kolumnowe (`span 1`) i 2-kolumnowe (`span 2`).
  - **Dynamiczne Viewporty i Safe Area**: Obsługa jednostki `100dvh`, deklaracja `viewport-fit=cover` oraz bezpieczny dolny padding `calc(80px + env(safe-area-inset-bottom, 0px))` zapobiegający zasłanianiu dolnych kontenerów przez pasek przeglądarki mobilnej.
  - **Pozycjonowanie 2D**: Współrzędne `col`, `row`, `colSpan`, `rowSpan` dla każdego kafelka (minimalny rozmiar 1×1).
  - **Interaktywne przenoszenie i skalowanie**: Lift-to-Drag ze wskaźnikiem wolnego miejsca oraz skalowanie prawym dolnym rogiem.
  - **14 Parametrów Biometrycznych**:
    1. Data i Godzina (`2x1`)
    2. Waga w kg (`2x1`) z automatyczną deltą
    3. Nawodnienie komórkowe (`1x2`) ze wskaźnikiem normy 55-65% (bez zbędnych plakietek)
    4. Overfat / Tkanka tłuszczowa (`1x1`) – ocena normy bazuje na płci ustawionej w profilu użytkownika (brak przełącznika M/K na kafelku)
    5. Mięśnie (% / kg) (`1x1`)
    6. Kości / Masa mineralna (% / kg) (`1x1`)
    7. BMI (`1x1`)
    8. Kcal / BMR (`1x1`)
    9. Ketony w moczu (`2x1`) – wykres trendu w czasie + poziomy pasek stanu na dziś z wycentrowaną przybliżoną wartością
    10. Utrzymanie Diety (`1x1`) – minimalistyczny wskaźnik ostatniego pomiaru (Keto, Low Carb, Lekka, Zła)
    11. Spożycie Alkoholu (`2x1`) – minimalistyczny licznik liczby dni od ostatniego spożycia oraz rodzaj ostatniego spożycia (Brak, Lekko, Ciężko)
    12. Główny Panel Trendów (`5x2`) z hybrydowym wykresem SVG Bezier + HTML Overlay
    13. Wizualizacja Kształtu i Składu Ciała (`3x2`) – poziomy pasek kompozycji oraz wyśrodkowany, powiększony przelicznik masy na kilogramy (Kości, Mięśnie, Tłuszcz, Woda)
    14. Historia Pomiarów (`8x2`) z przyciskiem otwierania pełnego rejestru w modalu
- **Modal Profilu Użytkownika & Rejestr Pomiarów**:
  - Pełnoekranowy `ModalComponent` z obsługą `100dvh` i klawisza `Escape`.
  - **Przyciski akcji na mobile (`<= 768px`)**: Wyświetlają wyłącznie ikony SVG w kwadratowych polach dotykowych (`34×34px`).
  - **Karta tożsamości profilu**: Wyświetla bezpieczne dane Google OAuth z przyciskiem **Wyloguj bezpośrednio pod awatarem** tożsamości oraz interaktywnym selektorem płci biologicznej (`♂ Mężczyzna` / `♀ Kobieta`) synchronizowanym z normami biometrii.
  - **Karta Instalacji PWA**: Przycisk "Zapisz / Zainstaluj aplikację na pulpicie" (dostępna dla użytkownika zalogowanego i gościa).
  - **Karta Diagnostyki Serwera**: Stan serwera Render, pomiar pingu w ms, baza MongoDB Atlas, pamięć podręczna PWA oraz przycisk sprawdzania na żądanie.

---

## 4. Rozwijanie Backendu (NestJS) & Persystencji JSON Per-User

- **Katalog**: `backend/`
- **Persystencja Danych (MongoDB Atlas + Fallback JSON)**:
  - Przy zdefiniowanym `MONGODB_URI`: bezpieczny zapis i odczyt z bazy MongoDB (kolekcje `users`, `layouts`, `measurements`), connection pooling (`maxIdleTimeMS: 60000`, `minPoolSize: 1`, `retryWrites: true`), auto-migracja z lokalnych plików JSON.
  - Przy braku `MONGODB_URI`: lokalny fallback do podfolderów `backend/data/users/<userId>/` (`user.json`, `layout.json`, `measurements.json`).
- **Zasada Zero Statystyk dla Nowych Kont**:
  - Nowo utworzone konto Google otrzymuje **pustą tablicę pomiarów (`[]`)** w bazie / pliku `measurements.json`.
  - Profil gościa (`guest`) inicjalizowany jest z przykładowymi danymi demonstracyjnymi.
- **Moduły i Endpointy**:
  - `backend/src/auth/` (`AuthModule`, `AuthController`, `AuthService`, `UserDto`):
    - `GET /api/auth/config` – pobranie konfiguracji Google Client ID z `.env`
    - `POST /api/auth/google` – logowanie tokenem Google JWT, upsert i auto-inicjalizacja profilu
    - `GET /api/auth/me` – odczyt aktywnego profilu
  - `backend/src/layout/` (`LayoutController`, `LayoutService`):
    - `GET /api/layout`, `PUT /api/layout`, `POST /api/layout/reset` (z obsługą nagłówka `x-user-id`)
  - `backend/src/measurements/` (`MeasurementsController`, `MeasurementsService`):
    - `GET /api/measurements`, `POST /api/measurements`, `GET /:id`, `PUT /:id`, `DELETE /:id`, `POST /reset` (z obsługą nagłówka `x-user-id`)
  - `backend/src/backup/` (`BackupController`, `BackupService`):
    - `GET /api/backup/export` – eksport wybranych danych do JSON (`types=measurements,layout,user`)
    - `POST /api/backup/import` – import i atomowe scalanie danych w MongoDB/JSON (upsert po ID)
    - `POST /api/backup/clear` – wyczyszczenie pomiarów danego użytkownika
  - `backend/src/storage/` (`StorageService`):
    - Centralne zarządzanie odczytem/zapisem w MongoDB / JSON per user z sanityzacją zapytań, maskowaniem sekretów i odpornością połączenia.
- **Konwencja importów ESM**: Wszystkie importy relatywne w TypeScript muszą posiadać rozszerzenie `.js` (np. `import { AuthService } from './auth.service.js'`).
- **Stabilność Sieciowa**: Nasłuchiwanie na `await app.listen(port, '0.0.0.0')`.


---

## 5. Wdrożenie Produkcyjne na Render.com (Blueprint & CI/CD)

- **Plik Blueprint**: `render.yaml` w katalogu głównym.
- **Wersja Node.js**: Wymagana wersja **Node 22** (`NODE_VERSION: 22` oraz `.node-version`) ze względu na kompilator Angular v22.
- **Struktura Usług na Renderze**:
  1. **`body-dashboard-backend` (Web Service)**:
     - `rootDir: backend`
     - `buildCommand: npm install --include=dev && npm run build` (flaga `--include=dev` zapewnia instalację `@nestjs/cli`)
     - `startCommand: npm run start:prod`
     - Zmienne środowiskowe: `NODE_ENV=production`, `PORT=10000`, sekrety OAuth `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` oraz `MONGODB_URI` z oznaczeniem `sync: false` (zarządzane wyłącznie w panelu Render). Predefiniowana baza `MONGODB_DB_NAME: body_dashboard`.
  2. **`body-dashboard` (Static Site)**:
     - `rootDir: frontend`
     - `buildCommand: npm install --include=dev && npm run build`
     - `staticPublishPath: dist/frontend/browser`
     - Reguła Rewrite: `/* -> /index.html` dla obsługi Angular Router.
     - Publiczny URL: `https://body-dashboard.onrender.com` (bez członu `-frontend`).
- **Launcher**: Wykluczony z procesu wdrażania (służy tylko do lokalnego developmentu).

### Procedura Krok Po Kroku: Konfiguracja MongoDB Atlas, Render.com i Google OAuth

1. **Konfiguracja Klastra w MongoDB Atlas**:
   - Zaloguj się na [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) i kliknij **`+ Create`**.
   - Wybierz plan darmowy **M0 Free** oraz region (np. AWS Frankfurt `eu-central-1`).
   - W sekcji **Security ➔ Database Access**: utwórz użytkownika bazy (np. `body_admin`) z hasłem i rolą zapisu/odczytu.
   - W sekcji **Security ➔ Network Access**: kliknij **`Add IP Address`** ➔ **`Allow Access from Anywhere`** (`0.0.0.0/0`) ➔ **`Confirm`**.
   - W zakładce **Database ➔ Connect ➔ Drivers (Node.js)** skopiuj ciąg połączeniowy i uzupełnij hasło oraz nazwę bazy:
     ```text
     mongodb+srv://body_admin:<twoje_haslo>@cluster0.xxxxx.mongodb.net/body_dashboard?retryWrites=true&w=majority
     ```

2. **Konfiguracja Usług i Nazewnictwa w Render.com**:
   - **Frontend**:
     - Przy nowym wdrożeniu z Blueprint (`render.yaml`) usługa przyjmie nazwę `body-dashboard`.
     - Jeśli usługa istniała wcześniej jako `body-dashboard-frontend`: przejdź do usługi ➔ **Settings** ➔ zmień **Name** na `body-dashboard` ➔ **Save Changes**. URL zmieni się na `https://body-dashboard.onrender.com`.
   - **Backend (`body-dashboard-backend`)**:
     - W panelu Render otwórz usługę **`body-dashboard-backend`**.
     - Przejdź do zakładki **Environment** i dodaj zmienne:
       - **Key**: `MONGODB_URI` / **Value**: ciąg połączeniowy z MongoDB Atlas.
       - **Key**: `GOOGLE_CLIENT_ID` / **Value**: Twoje ID klienta OAuth.
       - **Key**: `GOOGLE_CLIENT_SECRET` / **Value**: Twój sekret klienta OAuth.
     - Kliknij **`Save Changes`** — Render zrestartuje backend z nową konfiguracją.

3. **Konfiguracja Google Cloud Console (Autoryzowane Źródła)**:
   - Otwórz [Google Cloud Console ➔ Credentials](https://console.cloud.google.com/apis/credentials).
   - Otwórz identyfikator OAuth 2.0 (**Web client**).
   - W sekcji **Autoryzowane źródła JavaScript (Authorized JavaScript origins)** dodaj:
     - `http://localhost:4200`
     - `https://body-dashboard.onrender.com`
   - Kliknij **Zapisz** (**Save**).

4. **Weryfikacja Połączenia**:
   - Otwórz w przeglądarce endpoint: `https://body-dashboard-backend.onrender.com/api/health`.
   - Zweryfikuj pole `storage`:
     ```json
     {
       "status": "ok",
       "service": "backend",
       "storage": {
         "type": "mongodb",
         "connected": true,
         "database": "body_dashboard",
         "uriMasked": "mongodb+srv://body_admin:****@cluster0..."
       }
     }
     ```
   - Każde kolejne wdrożenie zachowuje stan danych i eliminuje problem utraty plików w ulotnym systemie plików kontenera.

---

## 6. Budowanie i Weryfikacja

```powershell
# Testy jednostkowe
npm.cmd --prefix backend test
npm.cmd --prefix frontend test -- --watch=false

# Budowanie produkcyjne
npm.cmd --prefix backend run build
npm.cmd --prefix frontend run build
```
