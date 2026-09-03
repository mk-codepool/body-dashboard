import { Injectable, signal, computed } from '@angular/core';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

@Injectable({
  providedIn: 'root'
})
export class PwaService {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  readonly canInstall = signal<boolean>(false);
  readonly isInstalled = signal<boolean>(this.checkIfInstalled());
  readonly isOnline = signal<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  readonly isIos = signal<boolean>(this.checkIfIos());

  readonly installStatusText = computed(() => {
    if (this.isInstalled()) {
      return 'Aplikacja zainstalowana jako program pulpitu';
    }
    if (this.canInstall()) {
      return 'Aplikacja gotowa do instalacji na pulpicie';
    }
    if (this.isIos()) {
      return 'Dostępna opcja Dodaj do ekranu początkowego w Safari';
    }
    return 'Działa jako aplikacja internetowa PWA';
  });

  constructor() {
    this.initPwaListeners();
    this.registerServiceWorker();
  }

  private checkIfInstalled(): boolean {
    if (typeof window === 'undefined') return false;
    const isStandalone = typeof window.matchMedia === 'function' ? window.matchMedia('(display-mode: standalone)').matches : false;
    const isIosStandalone = (window.navigator as any)?.standalone === true;
    return Boolean(isStandalone || isIosStandalone);
  }

  private checkIfIos(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua) && !(window as any)?.MSStream;
  }

  private initPwaListeners(): void {
    if (typeof window === 'undefined') return;

    // Przechwycenie monitu instalacji PWA
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.canInstall.set(true);
    });

    // Zdarzenie po pomyślnym zainstalowaniu aplikacji
    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.canInstall.set(false);
      this.isInstalled.set(true);
      console.log('[PWA] Aplikacja Body Dashboard została pomyślnie zainstalowana na pulpicie!');
    });

    // Monitorowanie stanu sieci (online / offline)
    window.addEventListener('online', () => this.isOnline.set(true));
    window.addEventListener('offline', () => this.isOnline.set(false));

    // Dynamiczne śledzenie trybu standalone
    if (typeof window.matchMedia === 'function') {
      try {
        window.matchMedia('(display-mode: standalone)').addEventListener('change', (evt) => {
          this.isInstalled.set(evt.matches);
        });
      } catch {
        // starsze przeglądarki
      }
    }
  }

  /**
   * Rejestracja Service Workera
   */
  private registerServiceWorker(): void {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((reg) => {
            console.log('[PWA] Service Worker zarejestrowany pomyślnie. Zakres:', reg.scope);
          })
          .catch((err) => {
            console.warn('[PWA] Rejestracja Service Workera nie powiodła się:', err);
          });
      });
    }
  }

  /**
   * Wywołanie monitu instalacji aplikacji na pulpicie
   */
  async installApp(): Promise<'accepted' | 'dismissed' | 'unsupported'> {
    if (!this.deferredPrompt) {
      return 'unsupported';
    }

    try {
      await this.deferredPrompt.prompt();
      const choice = await this.deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        this.canInstall.set(false);
        this.isInstalled.set(true);
        this.deferredPrompt = null;
        return 'accepted';
      }
      return 'dismissed';
    } catch (err) {
      console.error('[PWA] Błąd wywołania instalacji:', err);
      return 'unsupported';
    }
  }
}
