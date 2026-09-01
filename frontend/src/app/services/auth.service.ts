import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface UserDto {
  id: string;
  sub?: string;
  email: string;
  name: string;
  givenName?: string;
  familyName?: string;
  emailVerified?: boolean;
  picture?: string;
  locale?: string;
  provider: 'google' | 'guest';
  createdAt: string;
  lastLoginAt: string;
  googleRawClaims?: Record<string, any>;
}

export interface AuthResponseDto {
  user: UserDto;
  token: string;
  isNewUser?: boolean;
}

export interface AuthConfigDto {
  googleClientId: string;
  isGoogleConfigured: boolean;
}

const AUTH_USER_KEY = 'body_dashboard_active_user_v1';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/api/auth';

  readonly currentUser = signal<UserDto | null>(this.loadStoredUser());
  readonly isAuthModalOpen = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly googleClientId = signal<string>('');
  readonly isGoogleConfigured = signal<boolean>(false);

  readonly isLoggedIn = computed(() => {
    const user = this.currentUser();
    return user !== null && user.id !== 'guest';
  });

  readonly currentUserId = computed(() => {
    return this.currentUser()?.id || 'guest';
  });

  readonly userDisplayName = computed(() => {
    const user = this.currentUser();
    if (!user) return 'Gość';
    return user.name || user.email || 'Użytkownik';
  });

  readonly userInitials = computed(() => {
    const name = this.userDisplayName();
    if (!name || name === 'Gość') return 'G';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  });

  constructor() {
    this.loadAuthConfig();

    // Auto save active user to localStorage
    effect(() => {
      const user = this.currentUser();
      if (typeof localStorage !== 'undefined') {
        if (user) {
          localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
        } else {
          localStorage.removeItem(AUTH_USER_KEY);
        }
      }
    });
  }

  private loadStoredUser(): UserDto | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(AUTH_USER_KEY);
      if (raw) {
        return JSON.parse(raw) as UserDto;
      }
    } catch {
      // ignore
    }
    return null;
  }

  async loadAuthConfig(): Promise<void> {
    try {
      const config = await firstValueFrom(
        this.http.get<AuthConfigDto>(`${this.apiUrl}/config`).pipe(
          catchError(() => of({ googleClientId: '', isGoogleConfigured: false }))
        )
      );
      if (config) {
        this.googleClientId.set(config.googleClientId || '');
        this.isGoogleConfigured.set(Boolean(config.isGoogleConfigured));
      }
    } catch {
      // ignore
    }
  }

  openAuthModal(): void {
    this.errorMessage.set('');
    this.isAuthModalOpen.set(true);
    this.loadAuthConfig();
  }

  closeAuthModal(): void {
    this.isAuthModalOpen.set(false);
    this.errorMessage.set('');
  }

  toggleAuthModal(): void {
    if (this.isAuthModalOpen()) {
      this.closeAuthModal();
    } else {
      this.openAuthModal();
    }
  }

  /**
   * Logowanie przez oficjalny token Google OAuth (GIS)
   */
  async loginWithGoogleToken(credential: string): Promise<boolean> {
    this.isLoading.set(true);
    this.errorMessage.set('');
    try {
      const res = await firstValueFrom(
        this.http.post<AuthResponseDto>(`${this.apiUrl}/google`, { credential }).pipe(
          catchError(err => {
            this.errorMessage.set(err.error?.message || 'Błąd logowania przez Google.');
            return of(null);
          })
        )
      );

      if (res?.user) {
        this.currentUser.set(res.user);
        return true;
      }
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Wylogowanie użytkownika (powrót do trybu gościa)
   */
  logout(): void {
    this.currentUser.set(null);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(AUTH_USER_KEY);
    }
  }
}
