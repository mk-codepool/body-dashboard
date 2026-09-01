import { Injectable } from '@nestjs/common';
import { StorageService, DashboardWidgetConfig } from '../storage/storage.service.js';

@Injectable()
export class LayoutService {
  constructor(private readonly storageService: StorageService) {}

  async getLayout(userId?: string): Promise<DashboardWidgetConfig[]> {
    return this.storageService.getLayout(userId);
  }

  async updateLayout(
    layout: DashboardWidgetConfig[],
    userId?: string,
  ): Promise<DashboardWidgetConfig[]> {
    return this.storageService.saveLayout(layout, userId);
  }

  async resetLayout(userId?: string): Promise<DashboardWidgetConfig[]> {
    return this.storageService.resetLayout(userId);
  }
}
