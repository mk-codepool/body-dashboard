import { Controller, Post, Get, Body, Headers } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import type { GoogleAuthDto, AuthResponseDto, UserDto } from './dto/user.dto.js';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('config')
  getConfig(): { googleClientId: string; isGoogleConfigured: boolean } {
    return this.authService.getAuthConfig();
  }

  @Post('google')
  async googleLogin(@Body() dto: GoogleAuthDto): Promise<AuthResponseDto> {
    return this.authService.loginWithGoogle(dto);
  }

  @Get('me')
  async getMe(@Headers('x-user-id') userId?: string): Promise<UserDto> {
    return this.authService.getCurrentUser(userId);
  }
}
