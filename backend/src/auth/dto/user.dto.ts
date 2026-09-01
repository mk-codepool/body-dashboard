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
  gender?: string;
  provider: 'google' | 'guest';
  createdAt: string;
  lastLoginAt: string;
  googleRawClaims?: Record<string, any>;
}

export interface GoogleAuthDto {
  credential?: string; // Google Identity Services JWT token
  idToken?: string;
  email?: string;
  name?: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
  sub?: string;
}

export interface AuthResponseDto {
  user: UserDto;
  token: string;
  isNewUser?: boolean;
}
