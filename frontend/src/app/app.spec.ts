import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { App } from './app';

describe('App', () => {
  let fixture: ComponentFixture<App>;
  let app: App;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    app = fixture.componentInstance;
  });

  it('should create the app', () => {
    expect(app).toBeTruthy();
  });

  it('should hide "+ Pomiar" and container editing controls and show "Loguj" button when not logged in', async () => {
    app.authService.currentUser.set(null);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.topbar-add-btn')).toBeNull();
    expect(compiled.querySelector('.layout-controls')).toBeNull();

    const loginBtn = compiled.querySelector('.topbar-login-btn') as HTMLButtonElement;
    expect(loginBtn).toBeTruthy();
    expect(loginBtn.textContent).toContain('Loguj');
  });

  it('should display only the login prompt on the auth modal when not logged in', async () => {
    app.authService.currentUser.set(null);
    app.authService.isAuthModalOpen.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.login-prompt-card')).toBeTruthy();
    expect(compiled.querySelector('.profile-hero-card')).toBeNull();
    expect(compiled.querySelector('.pwa-install-card')).toBeNull();
    expect(compiled.querySelector('.backup-section')).toBeNull();
  });

  it('should show "+ Pomiar", layout controls and user profile pill when logged in', async () => {
    app.authService.currentUser.set({
      id: 'test-google-user',
      email: 'test@gmail.com',
      name: 'Jan Kowalski',
      provider: 'google',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    });
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.topbar-add-btn')).toBeTruthy();
    expect(compiled.querySelector('.layout-controls')).toBeTruthy();
    expect(compiled.querySelector('.user-account-btn')).toBeTruthy();
    expect(compiled.querySelector('.topbar-login-btn')).toBeNull();
  });
});
