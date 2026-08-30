import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DashboardLayoutService } from './dashboard-layout.service';

describe('DashboardLayoutService', () => {
  let service: DashboardLayoutService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DashboardLayoutService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(DashboardLayoutService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with 12 default widgets', () => {
    const widgets = service.widgets();
    expect(widgets.length).toBe(12);
  });

  it('should toggle edit mode', () => {
    expect(service.isEditMode()).toBe(false);
    service.toggleEditMode();
    expect(service.isEditMode()).toBe(true);
    service.toggleEditMode();
    expect(service.isEditMode()).toBe(false);
  });
});
