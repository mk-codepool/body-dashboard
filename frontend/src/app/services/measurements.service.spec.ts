import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MeasurementsService } from './measurements.service';

describe('MeasurementsService', () => {
  let service: MeasurementsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        MeasurementsService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(MeasurementsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have initial measurements history', () => {
    const list = service.history();
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list[0].weight).toBeDefined();
  });
});
