import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should manage auth modal state', () => {
    expect(service.isAuthModalOpen()).toBe(false);
    service.openAuthModal();
    expect(service.isAuthModalOpen()).toBe(true);
    service.closeAuthModal();
    expect(service.isAuthModalOpen()).toBe(false);
  });

  it('should default to guest user id if no active user', () => {
    expect(service.currentUserId()).toBeDefined();
  });
});
