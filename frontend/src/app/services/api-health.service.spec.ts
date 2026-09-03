import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ApiHealthService } from './api-health.service';
import { getApiBaseUrl } from './api.config';

describe('ApiHealthService', () => {
  let service: ApiHealthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ApiHealthService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(ApiHealthService);
    httpMock = TestBed.inject(HttpTestingController);

    // Obsłużenie żądania wysyłanego automatycznie w konstruktorze
    const req = httpMock.match(`${getApiBaseUrl()}/api/health`);
    if (req.length > 0) {
      req[0].flush({
        status: 'ok',
        service: 'backend',
        timestamp: new Date().toISOString(),
        uptimeSeconds: 120,
        version: '1.0.0',
        storage: { type: 'mongodb', connected: true }
      });
    }
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('powinien zostać utworzony', () => {
    expect(service).toBeTruthy();
  });

  it('powinien raportować status i sygnały stanu serwera', () => {
    expect(service.status()).toBeDefined();
    expect(service.statusBadgeText()).toBeTruthy();
    expect(service.statusDescription()).toBeTruthy();
  });

  it('powinien zaktualizować status na online po pomyślnej odpowiedzi', async () => {
    const checkPromise = service.checkHealth(true);
    const req = httpMock.expectOne(`${getApiBaseUrl()}/api/health`);
    expect(req.request.method).toBe('GET');
    req.flush({
      status: 'ok',
      service: 'backend',
      timestamp: new Date().toISOString(),
      uptimeSeconds: 300,
      version: '1.0.0',
      storage: { type: 'mongodb', connected: true }
    });

    const result = await checkPromise;
    expect(result).toBe(true);
    expect(service.isOnline()).toBe(true);
    expect(service.storageInfo()?.type).toBe('mongodb');
  });
});
