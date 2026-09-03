import { getApiBaseUrl } from './api.config';

describe('getApiBaseUrl', () => {
  const originalCustomUrl = (window as any).__BODY_DASHBOARD_API_URL__;

  beforeEach(() => {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.removeItem('BODY_DASHBOARD_API_URL');
      }
    } catch {}
    delete (window as any).__BODY_DASHBOARD_API_URL__;
  });

  afterEach(() => {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.removeItem('BODY_DASHBOARD_API_URL');
      }
    } catch {}
    if (originalCustomUrl) {
      (window as any).__BODY_DASHBOARD_API_URL__ = originalCustomUrl;
    } else {
      delete (window as any).__BODY_DASHBOARD_API_URL__;
    }
  });

  it('powinien zwracać domyślny adres produkcyjny lub localhost w testach', () => {
    const url = getApiBaseUrl();
    expect(url).toMatch(/localhost|body-dashboard/);
  });

  it('powinien używać zmiennej globalnej window.__BODY_DASHBOARD_API_URL__', () => {
    (window as any).__BODY_DASHBOARD_API_URL__ = 'https://custom-window-api.onrender.com';
    expect(getApiBaseUrl()).toBe('https://custom-window-api.onrender.com');
  });

  it('powinien usunąć końcowy ukośnik z adresu window', () => {
    (window as any).__BODY_DASHBOARD_API_URL__ = 'https://custom-window-api.onrender.com/';
    expect(getApiBaseUrl()).toBe('https://custom-window-api.onrender.com');
  });
});
