# Body Dashboard

Zintegrowane środowisko dla aplikacji **Angular (frontend)**, **NestJS (backend)** oraz **Launchera (orchestrator)** z dashboardem zarządzającym.

---

## 📁 Struktura Projektu

```text
body-dashboard/
├── start.js               # Główny punkt startowy - uruchamia Launcher (`node start`)
├── package.json           # Skrypty pomocnicze całego projektu
│
├── frontend/              # Aplikacja frontendowa Angular v22
│   ├── src/
│   │   ├── app/           # Komponenty ze Standalone Components, Signal API i integracją HTTP
│   │   └── ...
│   └── package.json
│
├── backend/               # Aplikacja backendowa NestJS
│   ├── src/
│   │   ├── app.controller.ts  # Endpointy /, /api/health, /api/info
│   │   ├── app.service.ts
│   │   └── main.ts            # Konfiguracja CORS i serwera
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

Wystarczy wywołać prostą komendę w katalogu głównym:

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
| **Angular Frontend** | [http://localhost:4200](http://localhost:4200) | Interfejs użytkownika z weryfikacją połączenia do API |
| **NestJS Backend** | [http://localhost:3000](http://localhost:3000) | REST API z endpointami `/api/health` oraz `/api/info` |

---

## ⌨️ Skróty Klawiszowe w Konsoli Launchera

Podczas działania Launchera w terminalu możesz używać skrótów:
- `b` – Restartuje **NestJS Backend**
- `f` – Restartuje **Angular Frontend**
- `r` – Restartuje **wszystkie usługi**
- `o` – Otwiera Web Dashboard w domyślnej przeglądarce (`http://localhost:4000`)
- `q` lub `Ctrl + C` – Bezpiecznie zatrzymuje wszystkie procesy (Graceful Shutdown)
