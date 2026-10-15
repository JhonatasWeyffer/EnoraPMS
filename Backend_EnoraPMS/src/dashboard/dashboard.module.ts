import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { PrismaModule } from '../prisma/prisma.module'; // Importante: garante acesso ao banco

@Module({
  imports: [PrismaModule], 
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}