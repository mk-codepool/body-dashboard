import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { MeasurementsService } from './measurements.service.js';
import type { MeasurementRecord } from '../storage/storage.service.js';

@Controller('api/measurements')
export class MeasurementsController {
  constructor(private readonly measurementsService: MeasurementsService) { }

  @Get()
  async getAll(): Promise<MeasurementRecord[]> {
    return this.measurementsService.getAll();
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<MeasurementRecord> {
    return this.measurementsService.getById(id);
  }

  @Post()
  async create(@Body() record: any): Promise<MeasurementRecord> {
    return this.measurementsService.create(record);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() record: any,
  ): Promise<MeasurementRecord> {
    return this.measurementsService.update(id, record);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<{ success: boolean; id: string }> {
    return this.measurementsService.delete(id);
  }

  @Post('reset')
  async reset(): Promise<MeasurementRecord[]> {
    return this.measurementsService.reset();
  }
}
