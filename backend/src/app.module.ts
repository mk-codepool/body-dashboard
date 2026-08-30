import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { StorageService } from './storage/storage.service.js';
import { LayoutController } from './layout/layout.controller.js';
import { LayoutService } from './layout/layout.service.js';
import { MeasurementsController } from './measurements/measurements.controller.js';
import { MeasurementsService } from './measurements/measurements.service.js';

@Module({
  imports: [],
  controllers: [AppController, LayoutController, MeasurementsController],
  providers: [AppService, StorageService, LayoutService, MeasurementsService],
})
export class AppModule {}
