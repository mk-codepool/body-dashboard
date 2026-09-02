import { Module } from '@nestjs/common';
import { BackupController } from './backup.controller.js';
import { BackupService } from './backup.service.js';
import { StorageService } from '../storage/storage.service.js';

@Module({
  controllers: [BackupController],
  providers: [BackupService, StorageService],
  exports: [BackupService],
})
export class BackupModule {}
