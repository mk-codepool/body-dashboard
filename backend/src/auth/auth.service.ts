import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { StorageService } from '../storage/storage.service.js';
import type { UserDto, GoogleAuthDto, AuthResponseDto } from './dto/user.dto.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly storageService: StorageService) {}

  /**
   * Zwraca konfigurację Google Client ID ze zmiennych środowiskowych .env
   */
  getAuthConfig(): { googleClientId: string; isGoogleConfigured: boolean } {
    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    return {
      googleClientId: clientId,
      isGoogleConfigured: Boolean(clientId && !clientId.includes('twoj-klient-id') && !clientId.includes('your-client-id')),
    };
  }

  /**
   * Bezpieczne dekodowanie payloadu JWT z Google Identity Services (GIS)
   */
  private decodeGoogleJwt(credential: string): any {
    try {
      const parts = credential.split('.');
      if (parts.length < 2) {
        throw new Error('Niepoprawny format JWT');
      }
      const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const decodedJson = Buffer.from(payloadBase64, 'base64').toString('utf-8');
      return JSON.parse(decodedJson);
    } catch (err) {
      this.logger.error('Błąd podczas dekodowania tokena Google JWT:', err);
      throw new UnauthorizedException('Niepoprawny token autoryzacyjny Google.');
    }
  }

  /**
   * Logowanie i rejestracja przez Google OAuth / Google Identity Services
   */
  async loginWithGoogle(dto: GoogleAuthDto): Promise<AuthResponseDto> {
    let email = dto.email;
    let name = dto.name;
    let givenName = dto.givenName;
    let familyName = dto.familyName;
    let picture = dto.picture;
    let sub = dto.sub;
    let emailVerified: boolean | undefined = undefined;
    let locale: string | undefined = undefined;
    let rawClaims: Record<string, any> | undefined = undefined;

    if (dto.credential) {
      const payload = this.decodeGoogleJwt(dto.credential);
      rawClaims = payload;
      email = payload.email || email;
      name = payload.name || name;
      givenName = payload.given_name || givenName;
      familyName = payload.family_name || familyName;
      picture = payload.picture || picture;
      sub = payload.sub || sub;
      emailVerified = payload.email_verified !== undefined ? Boolean(payload.email_verified) : undefined;
      locale = payload.locale || locale;
    }

    if (!email && !sub) {
      throw new UnauthorizedException('Brak identyfikatora użytkownika Google (email lub sub).');
    }

    const safeId = `google_${(email || sub || 'user').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()}`;
    const existingUser = await this.storageService.getUser(safeId);

    const now = new Date().toISOString();
    let isNewUser = false;
    let user: UserDto;

    if (existingUser) {
      user = {
        ...existingUser,
        sub: sub || existingUser.sub,
        name: name || existingUser.name,
        givenName: givenName || existingUser.givenName,
        familyName: familyName || existingUser.familyName,
        picture: picture || existingUser.picture,
        emailVerified: emailVerified !== undefined ? emailVerified : existingUser.emailVerified,
        locale: locale || existingUser.locale,
        googleRawClaims: rawClaims || existingUser.googleRawClaims,
        lastLoginAt: now,
      };
    } else {
      isNewUser = true;
      user = {
        id: safeId,
        sub: sub,
        email: email || `${safeId}@google.user`,
        name: name || 'Użytkownik Google',
        givenName: givenName,
        familyName: familyName,
        picture: picture,
        emailVerified: emailVerified,
        locale: locale,
        provider: 'google',
        createdAt: now,
        lastLoginAt: now,
        googleRawClaims: rawClaims,
      };
    }

    await this.storageService.saveUser(user);
    this.logger.log(`Zalogowano użytkownika Google: ${user.name} (${user.email}) -> [${user.id}]`);

    return {
      user,
      token: `token_${user.id}_${Date.now()}`,
      isNewUser,
    };
  }

  async getCurrentUser(userId?: string): Promise<UserDto> {
    const safeId = userId || 'guest';
    const user = await this.storageService.getUser(safeId);
    if (user) return user;

    const fallback: UserDto = {
      id: safeId,
      name: safeId === 'guest' ? 'Gość' : 'Użytkownik',
      email: `${safeId}@body-dashboard.local`,
      provider: safeId === 'guest' ? 'guest' : 'google',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };
    await this.storageService.saveUser(fallback);
    return fallback;
  }
}
