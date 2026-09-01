import { Component, OnInit, OnDestroy, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { DashboardLayoutService } from './services/dashboard-layout.service';
import { AuthService } from './services/auth.service';
import { MeasurementsService } from './services/measurements.service';
import { NotificationService } from './services/notification.service';
import { ModalComponent } from './components/modal/modal';

declare const google: any;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ModalComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  readonly layoutService = inject(DashboardLayoutService);
  readonly authService = inject(AuthService);
  readonly measurementsService = inject(MeasurementsService);
  readonly notificationService = inject(NotificationService);

  openMeasurementsModal(): void {
    this.measurementsService.openModal();
  }

  readonly currentTime = signal<string>('');
  readonly currentDate = signal<string>('');
  private timerInterval?: ReturnType<typeof setInterval>;

  readonly googleLoginSuccessMsg = signal<string>('');

  readonly modalTitle = computed(() => {
    return this.authService.isLoggedIn() ? 'Profil użytkownika' : 'Logowanie Google';
  });

  readonly modalSubtitle = computed(() => {
    return this.authService.isLoggedIn()
      ? 'Dane i parametry Twojego profilu użytkownika'
      : 'Uwierzytelnij się bezpiecznie swoim kontem Google Identity Services';
  });

  readonly modalBadge = computed(() => {
    return this.authService.isLoggedIn() ? 'KONTO GOOGLE' : 'GOOGLE OAUTH';
  });

  constructor() {
    // When auth modal opens or clientId is loaded, attempt to initialize Google Identity Services
    effect(() => {
      if (this.authService.isAuthModalOpen() && !this.authService.isLoggedIn() && this.authService.isGoogleConfigured()) {
        setTimeout(() => this.initGoogleIdentityServices(), 100);
      }
    });
  }

  ngOnInit(): void {
    this.updateTime();
    this.timerInterval = setInterval(() => this.updateTime(), 1000);
    this.loadGoogleScript();
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  private updateTime(): void {
    const now = new Date();
    this.currentTime.set(
      now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    );
    this.currentDate.set(
      now.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' })
    );
  }

  private loadGoogleScript(): void {
    if (typeof document === 'undefined') return;
    if (document.getElementById('google-gsi-client')) return;

    const script = document.createElement('script');
    script.id = 'google-gsi-client';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      this.initGoogleIdentityServices();
    };
    document.head.appendChild(script);
  }

  initGoogleIdentityServices(): void {
    if (typeof google === 'undefined' || !google.accounts?.id) return;

    const clientId = this.authService.googleClientId();
    if (!clientId || clientId.includes('twoj-klient-id') || clientId.includes('your-client-id')) return;

    try {
      google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: { credential: string }) => {
          if (response.credential) {
            this.handleGoogleCredentialResponse(response.credential);
          }
        },
      });

      const container = document.getElementById('gsi-button-container');
      if (container) {
        container.innerHTML = '';
        google.accounts.id.renderButton(container, {
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          text: 'signin_with',
          logo_alignment: 'left',
          width: 280,
        });
      }
    } catch {
      // ignore
    }
  }

  async handleGoogleCredentialResponse(credential: string): Promise<void> {
    const ok = await this.authService.loginWithGoogleToken(credential);
    if (ok) {
      this.showSuccess('Zalogowano pomyślnie przez konto Google!');
    }
  }

  logout(): void {
    this.authService.logout();
    this.showSuccess('Wylogowano pomyślnie.');
  }

  private showSuccess(msg: string): void {
    this.googleLoginSuccessMsg.set(msg);
    setTimeout(() => {
      this.googleLoginSuccessMsg.set('');
    }, 4000);
  }
}
