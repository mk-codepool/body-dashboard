import { TestBed } from '@angular/core/testing';
import { PwaService } from './pwa.service';

describe('PwaService', () => {
  let service: PwaService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PwaService]
    });
    service = TestBed.inject(PwaService);
  });

  it('powinien zostać poprawnie utworzony', () => {
    expect(service).toBeTruthy();
  });

  it('powinien udostępniać sygnały stanu instalacji i sieci', () => {
    expect(service.canInstall()).toBeDefined();
    expect(service.isInstalled()).toBeDefined();
    expect(service.isOnline()).toBeDefined();
    expect(service.installStatusText()).toBeTruthy();
  });

  it('powinien bezpiecznie obsłużyć wywołanie instalacji, gdy prompt nie jest dostępny', async () => {
    const res = await service.installApp();
    expect(res).toBe('unsupported');
  });
});
