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

## ☁️ Wdrożenie Produkcyjne (Render.com)

Projekt posiada gotowy plik **Render Blueprint (`render.yaml`)**:
1. Na [dashboard.render.com](https://dashboard.render.com) kliknij **New +** ➔ **Blueprint**.
2. Wybierz to repozytorium z GitHuba.
3. W formularzu podaj wartości dla kluczy Google OAuth (`GOOGLE_CLIENT_ID` oraz `GOOGLE_CLIENT_SECRET`).
4. Kliknij **Apply** — Render automatycznie wdroży i połączy Frontend (Static Site) oraz Backend (Web Service).

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
