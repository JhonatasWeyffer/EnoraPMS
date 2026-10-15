import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  async getSummary() {
    return this.dashboardService.getSummary();
  }

  @Get('search')
  async searchGuest(@Query('q') query: string) {
    if (!query || query.trim().length < 2) return { movimentacoes: [] };
    return this.dashboardService.searchGuests(query);
  }
}