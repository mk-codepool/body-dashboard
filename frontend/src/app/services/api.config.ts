/**
 * Dynamiczny resolver adresu bazowego backendu REST API.
 * 
 * Kolejność priorytetów:
 * 1. Wymuszenie przez localStorage (`BODY_DASHBOARD_API_URL`) - przydatne do testów i debugowania
 * 2. Wymuszenie globalne przez obiekt window (`window.__BODY_DASHBOARD_API_URL__`)
 * 3. Środowisko lokalne (`localhost` / `127.0.0.1`) -> `http://localhost:3000`
 * 4. Render.com Auto-Discovery: automatycznie mapuje domenę frontendu (`body-dashboard.onrender.com` lub `*-frontend.onrender.com`) na `*-backend.onrender.com`
 * 5. Domyślny fallback produkcyjny: `https://body-dashboard-backend.onrender.com`
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        const customUrl = localStorage.getItem('BODY_DASHBOARD_API_URL');
        if (customUrl && customUrl.trim()) {
          return customUrl.trim().replace(/\/$/, '');
        }
      }
    } catch {
      // ignore localStorage errors in restricted contexts
    }

    if ((window as any).__BODY_DASHBOARD_API_URL__) {
      return String((window as any).__BODY_DASHBOARD_API_URL__).trim().replace(/\/$/, '');
    }

    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3000';
    }

    if (hostname.includes('body-dashboard-backend.onrender.com')) {
      return `https://${hostname}`;
    }

    // Domyślny stabilny adres backendu API w chmurze Render.com
    return 'https://body-dashboard-backend.onrender.com';
  }

  return 'https://body-dashboard-backend.onrender.com';
}
