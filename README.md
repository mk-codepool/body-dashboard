# Body Dashboard

Zintegrowane środowisko dla aplikacji **Angular (frontend)**, **NestJS (backend)** oraz **Launchera (orchestrator)** z modularnym gridem biometrii ciała i trwałym zapisem danych w plikach JSON.

---

## 📁 Struktura Projektu

```text
body-dashboard/
├── start.js               # Główny punkt startowy - uruchamia Launcher (`node start`)
├── package.json           # Skrypty pomocnicze całego projektu
├── AGENTS.md              # Wytyczne deweloperskie i architektoniczne
│
├── frontend/              # Aplikacja frontendowa Angular v22
│   ├── src/
│   │   ├── app/           # Komponenty Standalone, Signal API, Grid 2D
│   │   │   ├── services/  # DashboardLayoutService, MeasurementsService
│   │   │   └── dashboard/ # Modularny Grid Biometrii, Wykresy SVG Bezier
│   │   └── ...
│   └── package.json
│
├── backend/               # Aplikacja backendowa NestJS
│   ├── data/              # Trwałe pliki JSON (layout.json, measurements.json)
│   ├── src/
│   │   ├── storage/       # StorageService (zarządzanie plikami JSON)
│   │   ├── layout/        # Endpointy /api/layout (GET, PUT, POST /reset)
│   │   ├── measurements/  # Endpointy /api/measurements (CRUD pomiarów)
│   │   ├── app.controller.ts  # Endpointy /, /api/health, /api/info
│   │   ├── app.service.ts
│   │   └── main.ts        # Konfiguracja CORS i serwera
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

## 🚀 Uruchamianie

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

## 🌐 Dostępne Porty i Usługi

| Usługa | URL | Opis |
|---|---|---|
| **Launcher Web Dashboard** | [http://localhost:4000](http://localhost:4000) | Panel kontrolny, metryki, logi na żywo (SSE), restartowanie usług |
| **Angular Frontend** | [http://localhost:4200](http://localhost:4200) | Interfejs użytkownika z modularną siatką 2D, trybem edycji i wykresem biometrii |
| **NestJS Backend** | [http://localhost:3000](http://localhost:3000) | REST API z endpointami `/api/layout`, `/api/measurements`, `/api/health`, `/api/info` |

---

## ⌨️ Skróty Klawiszowe w Konsoli Launchera

Podczas działania Launchera w terminalu możesz używać skrótów:
- `b` – Restartuje **NestJS Backend**
- `f` – Restartuje **Angular Frontend**
- `r` – Restartuje **wszystkie usługi**
- `o` – Otwiera Web Dashboard w domyślnej przeglądarce (`http://localhost:4000`)
- `q` lub `Ctrl + C` – Bezpiecznie zatrzymuje wszystkie procesy (Graceful Shutdown)
