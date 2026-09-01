import { Controller, Get, Post, Put, Delete, Body, Param, Headers } from '@nestjs/common';
import { MeasurementsService } from './measurements.service.js';
import type { MeasurementRecord } from '../storage/storage.service.js';

@Controller('api/measurements')
export class MeasurementsController {
  constructor(private readonly measurementsService: MeasurementsService) {}

  @Get()
  async getAll(@Headers('x-user-id') userId?: string): Promise<MeasurementRecord[]> {
    return this.measurementsService.getAll(userId);
  }

  @Get(':id')
  async getById(
    @Param('id') id: string,
    @Headers('x-user-id') userId?: string,
  ): Promise<MeasurementRecord> {
    return this.measurementsService.getById(id, userId);
  }

  @Post()
  async create(
    @Body() record: any,
    @Headers('x-user-id') userId?: string,
  ): Promise<MeasurementRecord> {
    return this.measurementsService.create(record, userId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() record: any,
    @Headers('x-user-id') userId?: string,
  ): Promise<MeasurementRecord> {
    return this.measurementsService.update(id, record, userId);
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Headers('x-user-id') userId?: string,
  ): Promise<{ success: boolean; id: string }> {
    return this.measurementsService.delete(id, userId);
  }

  @Post('reset')
  async reset(@Headers('x-user-id') userId?: string): Promise<MeasurementRecord[]> {
    return this.measurementsService.reset(userId);
  }
}
