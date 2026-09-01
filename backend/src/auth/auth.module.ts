import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { StorageService } from '../storage/storage.service.js';

@Module({
  controllers: [AuthController],
  providers: [AuthService, StorageService],
  exports: [AuthService],
})
export class AuthModule {}
