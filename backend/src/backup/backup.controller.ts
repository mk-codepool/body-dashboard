import { Controller, Get, Post, Body, Query, Headers } from '@nestjs/common';
import { BackupService, BackupExportPayload, BackupImportResult } from './backup.service.js';

@Controller('api/backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get('export')
  async exportBackup(
    @Query('types') typesQuery?: string,
    @Headers('x-user-id') userId?: string,
  ): Promise<BackupExportPayload> {
    const types = typesQuery
      ? typesQuery.split(',').map(t => t.trim()).filter(Boolean)
      : undefined;
    return this.backupService.exportBackup(types, userId);
  }

  @Post('import')
  async importBackup(
    @Body() backupData: any,
    @Headers('x-user-id') userId?: string,
  ): Promise<BackupImportResult> {
    return this.backupService.importBackup(backupData, userId);
  }

  @Post('clear')
  async clearMeasurements(
    @Headers('x-user-id') userId?: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.backupService.clearMeasurements(userId);
  }
}
