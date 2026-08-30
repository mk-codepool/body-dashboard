import { Injectable } from '@nestjs/common';
import { StorageService, DashboardWidgetConfig } from '../storage/storage.service.js';

@Injectable()
export class LayoutService {
  constructor(private readonly storageService: StorageService) {}

  async getLayout(): Promise<DashboardWidgetConfig[]> {
    return this.storageService.getLayout();
  }

  async updateLayout(layout: DashboardWidgetConfig[]): Promise<DashboardWidgetConfig[]> {
    return this.storageService.saveLayout(layout);
  }

  async resetLayout(): Promise<DashboardWidgetConfig[]> {
    return this.storageService.resetLayout();
  }
}
