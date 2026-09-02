# Body Dashboard

Zintegrowane środowisko dla aplikacji **Angular (frontend)**, **NestJS (backend)** oraz **Launchera (orchestrator)** z modularnym gridem biometrii ciała, uwierzytelnianiem **Google OAuth**, widokiem **Profilu Użytkownika** i trwałym zapisem danych w plikach JSON per-user.

---

## 📁 Struktura Projektu

```text
body-dashboard/
├── start.js               # Główny punkt startowy - uruchamia Launcher (`node start`)
├── package.json           # Skrypty pomocnicze całego projektu
├── AGENTS.md              # Wytyczne deweloperskie i architektoniczne
├── render.yaml            # Render Blueprint (CI/CD: NestJS Web Service + Angular Static Site)
├── .node-version          # Wersja Node.js (22)
├── .env.example           # Wzorzec konfiguracji zmiennych środowiskowych
├── .env                   # Lokalne klucze Google OAuth i konfiguracja
│
├── frontend/              # Aplikacja frontendowa Angular v22 (SPA)
│   ├── src/
│   │   ├── app/           # Komponenty Standalone, Signal API, Grid 2D
│   │   │   ├── services/  # AuthService, DashboardLayoutService, MeasurementsService, api.config
│   │   │   ├── components/# Reużywalny ModalComponent
│   │   │   └── dashboard/ # Modularny Grid Biometrii, Wykresy SVG Bezier
│   │   └── ...
│   └── package.json
│
├── backend/               # Aplikacja backendowa NestJS (REST API)
│   ├── data/
│   │   └── users/         # Izolowane magazyny JSON per-user (<userId>/user.json, layout.json, measurements.json)
│   ├── src/
│   │   ├── auth/          # Moduł Auth: AuthService, AuthController, Google GIS JWT decoding, .env config
│   │   ├── storage/       # StorageService (zarządzanie danymi JSON per-user)
│   │   ├── layout/        # Endpointy /api/layout (GET, PUT, POST /reset)
│   │   ├── measurements/  # Endpointy /api/measurements (CRUD pomiarów)
│   │   ├── app.controller.ts  # Endpointy /, /api/health, /api/info
│   │   └── main.ts        # Bootstrap z obsługą .env i CORS
│   └── package.json
│
└── launcher/              # Moduł Launchera i Dashboardu
    ├── src/
    │   ├── index.js           # Główny proces Launchera
    │   ├── process-manager.js # Zarządzanie podprocesami (start, stop, restart, health check)
    │   ├── dashboard-server.js# Serwer HTTP i strumieniowanie SSE
    │   ├── cli-dashboard.js   # Konsolowy interfejs ANSI z obsługą skrótów klawiszowych
    │   └── public/index.html  # Nowoczesny Web Dashboard (Dark glassmorphism)
    └── package.json
```

---

## 🚀 Uruchamianie Lokalne

Wystarczy wywołać komendę w katalogu głównym:

```bash
node start
```

Alternatywnie:
```bash
npm start
```

> **Automatyczny start w przeglądarce**: Po uruchomieniu, launcher automatycznie otworzy Dashboard w domyślnej przeglądarce pod adresem `http://localhost:4000`.

---

## ☁️ Wdrożenie Produkcyjne (Render.com + MongoDB Atlas)

System plików na darmowym planie Render.com jest ulotny (**ephemeral**). Aby dane pomiarów biometrii, profile i układ kafelków nie znikały po każdym deployu lub restarcie instancji, projekt korzysta z bezpiecznej, darmowej bazy **MongoDB Atlas** (M0 Free Tier).

### 1. Przygotowanie Darmowej Bazy w MongoDB Atlas:
1. Zarejestruj się / zaloguj na [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
2. Utwórz darmowy klaster: **`+ Create`** ➔ plan **M0 Free** ➔ region (np. Frankfurt `eu-central-1`) ➔ **`Create Deployment`**.
3. Utwórz użytkownika bazy (**Security ➔ Database Access**): login np. `body_admin`, wygeneruj bezpieczne hasło i zapisz je.
4. Zezwól na dostęp sieciowy (**Security ➔ Network Access**): kliknij **`Add IP Address`** ➔ wybierz **`Allow Access from Anywhere`** (`0.0.0.0/0`) ➔ **`Confirm`**.
5. Pobierz ciąg połączeniowy (**Database ➔ Connect ➔ Drivers**):
   ```text
   mongodb+srv://body_admin:<haslo>@cluster0.xxxxx.mongodb.net/body_dashboard?retryWrites=true&w=majority
   ```

### 2. Wdrożenie na Render.com:
1. Na [dashboard.render.com](https://dashboard.render.com) kliknij **New +** ➔ **Blueprint**.
2. Wybierz to repozytorium z GitHuba.
3. W formularzu zmiennych środowiskowych podaj:
   - `GOOGLE_CLIENT_ID` oraz `GOOGLE_CLIENT_SECRET` (dla logowania Google OAuth).
   - `MONGODB_URI`: wklej przygotowany ciąg połączeniowy z Twoim hasłem i bazą `/body_dashboard`.
4. Kliknij **Apply** — Render automatycznie wdroży i połączy Frontend (Static Site) oraz Backend (Web Service).
5. Stan połączenia możesz zweryfikować wchodząc pod adres:
   `https://twoj-backend.onrender.com/api/health` — w polu `storage` pojawi się `"type": "mongodb", "connected": true`.

---

## 🔐 Konfiguracja Google OAuth 2.0 (.env)

Aby włączyć logowanie przez konto Google:
1. Skopiuj plik `.env.example` do pliku `.env`.
2. Wpisz swój identyfikator z Google Cloud Console:
   ```env
   GOOGLE_CLIENT_ID=twoj-klient-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=twoj-klient-secret
   PORT=3000
   ```
3. Zrestartuj backend (klawisz `b` w konsoli launchera lub ponowne uruchomienie `node start`).

---

## 🌐 Dostępne Porty i Usługi

| Usługa | URL | Opis |
|---|---|---|
| **Launcher Web Dashboard** | [http://localhost:4000](http://localhost:4000) | Panel kontrolny, metryki, logi na żywo (SSE), restartowanie usług |
| **Angular Frontend** | [http://localhost:4200](http://localhost:4200) | Interfejs użytkownika z modularną siatką 2D, trybem edycji, wykresem biometrii i panelem profilu Google |
| **NestJS Backend** | [http://localhost:3000](http://localhost:3000) | REST API z endpointami `/api/auth`, `/api/layout`, `/api/measurements`, `/api/health`, `/api/info` |

---

## ⌨️ Skróty Klawiszowe w Konsoli Launchera

Podczas działania Launchera w terminalu możesz używać skrótów:
- `b` – Restartuje **NestJS Backend**
- `f` – Restartuje **Angular Frontend**
- `r` – Restartuje **wszystkie usługi**
- `o` – Otwiera Web Dashboard w domyślnej przeglądarce (`http://localhost:4000`)
- `q` lub `Ctrl + C` – Bezpiecznie zatrzymuje wszystkie procesy (Graceful Shutdown)
