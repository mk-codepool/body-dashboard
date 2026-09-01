import { Controller, Get, Put, Post, Body } from '@nestjs/common';
import { LayoutService } from './layout.service.js';
import type { DashboardWidgetConfig } from '../storage/storage.service.js';

@Controller('api/layout')
export class LayoutController {
  constructor(private readonly layoutService: LayoutService) { }

  @Get()
  async getLayout(): Promise<DashboardWidgetConfig[]> {
    return this.layoutService.getLayout();
  }

  @Put()
  async updateLayout(@Body() layout: any): Promise<DashboardWidgetConfig[]> {
    return this.layoutService.updateLayout(layout);
  }

  @Post('reset')
  async resetLayout(): Promise<DashboardWidgetConfig[]> {
    return this.layoutService.resetLayout();
  }
}
