import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('api/health')
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('api/info')
  getInfo() {
    return this.appService.getInfo();
  }
}

