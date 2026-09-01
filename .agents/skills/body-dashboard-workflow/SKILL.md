---
name: body-dashboard-workflow
description: >-
  Przewodnik i instrukcja pracy z projektem body-dashboard. Używaj przy uruchamianiu,
  rozwijaniu endpointów NestJS, autoryzacji Google, komponentów Angular, modularnego grida biometrii, persystencji JSON per-user oraz rozbudowie launchera.
---

# Workflow Projektu Body Dashboard

Niniejszy skill zawiera procedury i instrukcje krok po kroku dotyczące pracy ze stosem technologicznym projektu:
- **Frontend**: Angular 22 (Standalone + Signals, Dark Minimalist Grid System, Google OAuth GIS, RxJS HttpClient)
- **Backend**: NestJS (ESM + TypeScript, JSON Data Storage per-user, Google JWT Decoding, .env Config)
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

## 2. Konfiguracja Środowiskowa (.env) & Google OAuth

1. **Plik `.env` w głównym katalogu**:
   - `GOOGLE_CLIENT_ID`: identyfikator klienta aplikacji internetowej z Google Cloud Console (`*.apps.googleusercontent.com`).
   - `GOOGLE_CLIENT_SECRET`: sekret klienta OAuth.
   - `PORT`: port backendu (domyślnie `3000`).
2. **Backend**:
   - Automatycznie wczytuje `.env` przy starcie za pomocą natywnego mechanizmu Node.js `process.loadEnvFile()`.
   - Udostępnia endpoint `GET /api/auth/config` dostarczający Client ID frontendowi.
3. **Frontend**:
   - `AuthService` dynamicznie pobiera konfigurację i inicjalizuje Google Identity Services (GIS).
   - Brak jakichkolwiek widocznych wyciągów `.env` lub formularzy wklejania kluczy w UI.

---

## 3. Rozwijanie Frontendu (Angular) & Modularnego Grida 2D

- **Katalog**: `frontend/`
- **Root komponent**: `frontend/src/app/app.ts` (górna belka z przyciskiem "Dostosuj pulpit", przyciskiem profilu Google, zegarem czasu rzeczywistego i `<router-outlet />`).
- **Serwisy Danych**:
  - `frontend/src/app/services/auth.service.ts`: zarządzanie stanem uwierzytelnienia (`currentUser`, `isLoggedIn`), integracja z Google OAuth (GIS), persystencja w `localStorage`.
  - `frontend/src/app/services/dashboard-layout.service.ts`: reaktywne pozycjonowanie 2D, tryb edycji, sprawdzanie kolizji `canPlaceWidget`, auto-sync z `PUT /api/layout` z nagłówkiem `x-user-id`.
  - `frontend/src/app/services/measurements.service.ts`: pobieranie i modyfikacja pomiarów biometrii (`history`), integracja z `/api/measurements` z nagłówkiem `x-user-id`.
- **Główny kontener widoku**: `frontend/src/app/dashboard/dashboard.ts`
- **Konwencje Grida 2D i Parametrów**:
  - **Siatka Kwadratowa**: 8 kolumn `repeat(8, minmax(120px, 1fr))`, stała wysokość wiersza `135px`.
  - **Pozycjonowanie 2D**: Współrzędne `col`, `row`, `colSpan`, `rowSpan` dla każdego kafelka (minimalny rozmiar 1×1).
  - **Interaktywne przenoszenie i skalowanie**: Lift-to-Drag ze wskaźnikiem wolnego miejsca oraz skalowanie prawym dolnym rogiem.
  - **Parametry Biometryczne**:
    1. Data i Godzina (`2x1`)
    2. Waga w kg (`2x1`) z automatyczną deltą
    3. Total Body Water TBW (`1x2`) ze zbiornikiem poziomu
    4. Overfat / Tkanka tłuszczowa (`1x1`)
    5. Mięśnie (% / kg) (`1x1`)
    6. Kości / Masa mineralna (% / kg) (`1x1`)
    7. BMI (`1x1`)
    8. Kcal / BMR (`1x1`)
    9. Ketony w moczu (`2x1`) z 6-stopniowym testem paskowym
    10. Główny Panel Trendów (`5x2`) z hybrydowym wykresem SVG Bezier + HTML Overlay
    11. Kształt i Skład Ciała (`3x2`) – koncentryczne warstwy sylwetki (Kości, Mięśnie, Tłuszcz, Woda)
    12. Historia Pomiarów (`8x2`) z przyciskiem otwierania pełnego rejestru w modalu
- **Modal Profilu Użytkownika & Logowania Google**:
  - Przycisk w prawym górnym rogu górnej belki otwiera pełnoekranowy `ModalComponent`.
  - **Niezalogowany**: Elegancka karta logowania z oficjalnym przyciskiem Google Identity Services.
  - **Zalogowany ("Profil użytkownika")**:
    - Karta tożsamości z awatarem Google, imieniem i adresem e-mail.
    - Zestawienie atrybutów pobranych z Google: Imię i nazwisko, Imię, Nazwisko, Adres e-mail, Język i region, Data pierwszego logowania, Ostatnie logowanie.
    - Rozwijana sekcja "Wszystkie parametry przekazane przez Google" z pełną tabelą atrybutów tokena JWT.
    - Całkowity brak informacji technicznych o backendzie lub ścieżkach plików.

---

## 4. Rozwijanie Backendu (NestJS) & Persystencji JSON Per-User

- **Katalog**: `backend/`
- **Katalog danych per-user**: `backend/data/users/<userId>/`
  - `user.json` – pełne dane profilowe Google (`id`, `sub`, `name`, `givenName`, `familyName`, `email`, `emailVerified`, `picture`, `locale`, `createdAt`, `lastLoginAt`, `googleRawClaims`).
  - `layout.json` – spersonalizowany układ modularnego grida kafelków.
  - `measurements.json` – dedykowany rejestr pomiarów biometrii.
- **Zasada Zero Statystyk dla Nowych Kont**:
  - Nowo utworzone konto Google otrzymuje **pustą tablicę pomiarów (`[]`)** w pliku `measurements.json`.
  - Profil gościa (`guest`) inicjalizowany jest z przykładowymi danymi demonstracyjnymi.
- **Moduły i Endpointy**:
  - `backend/src/auth/` (`AuthModule`, `AuthController`, `AuthService`, `UserDto`):
    - `GET /api/auth/config` – pobranie konfiguracji Google Client ID z `.env`
    - `POST /api/auth/google` – logowanie tokenem Google JWT, upsert i auto-inicjalizacja katalogu usera
    - `GET /api/auth/me` – odczyt aktywnego profilu
  - `backend/src/layout/` (`LayoutController`, `LayoutService`):
    - `GET /api/layout`, `PUT /api/layout`, `POST /api/layout/reset` (z obsługą nagłówka `x-user-id`)
  - `backend/src/measurements/` (`MeasurementsController`, `MeasurementsService`):
    - `GET /api/measurements`, `POST /api/measurements`, `GET /:id`, `PUT /:id`, `DELETE /:id`, `POST /reset` (z obsługą nagłówka `x-user-id`)
  - `backend/src/storage/` (`StorageService`):
    - Centralne zarządzanie odczytem/zapisem plików w podfolderach `data/users/<userId>/`.
- **Konwencja importów ESM**: Wszystkie importy relatywne w TypeScript muszą posiadać rozszerzenie `.js` (np. `import { AuthService } from './auth.service.js'`).

---

## 5. Budowanie i Weryfikacja

```powershell
# Testy jednostkowe
npm.cmd --prefix backend test
npm.cmd --prefix frontend test -- --watch=false

# Budowanie produkcyjne
npm.cmd --prefix backend run build
npm.cmd --prefix frontend run build
```
