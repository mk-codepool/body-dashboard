import { Injectable, signal } from '@angular/core';

export type BannerType = 'success' | 'error' | 'info' | 'warning';

export interface BannerNotification {
  id: string;
  message: string;
  type: BannerType;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  readonly activeBanner = signal<BannerNotification | null>(null);
  private timeoutId?: ReturnType<typeof setTimeout>;

  show(message: string, type: BannerType = 'success', duration = 5000): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }

    const banner: BannerNotification = {
      id: `banner_${Date.now()}`,
      message,
      type,
      duration
    };

    this.activeBanner.set(banner);

    if (duration > 0) {
      this.timeoutId = setTimeout(() => {
        this.dismiss();
      }, duration);
    }
  }

  showSuccess(message: string, duration = 5000): void {
    this.show(message, 'success', duration);
  }

  showError(message: string, duration = 6000): void {
    this.show(message, 'error', duration);
  }

  showInfo(message: string, duration = 5000): void {
    this.show(message, 'info', duration);
  }

  showWarning(message: string, duration = 5000): void {
    this.show(message, 'warning', duration);
  }

  dismiss(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
    this.activeBanner.set(null);
  }
}
