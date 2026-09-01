import { Controller, Get, Put, Post, Body, Headers } from '@nestjs/common';
import { LayoutService } from './layout.service.js';
import type { DashboardWidgetConfig } from '../storage/storage.service.js';

@Controller('api/layout')
export class LayoutController {
  constructor(private readonly layoutService: LayoutService) {}

  @Get()
  async getLayout(@Headers('x-user-id') userId?: string): Promise<DashboardWidgetConfig[]> {
    return this.layoutService.getLayout(userId);
  }

  @Put()
  async updateLayout(
    @Body() layout: any,
    @Headers('x-user-id') userId?: string,
  ): Promise<DashboardWidgetConfig[]> {
    return this.layoutService.updateLayout(layout, userId);
  }

  @Post('reset')
  async resetLayout(@Headers('x-user-id') userId?: string): Promise<DashboardWidgetConfig[]> {
    return this.layoutService.resetLayout(userId);
  }
}
