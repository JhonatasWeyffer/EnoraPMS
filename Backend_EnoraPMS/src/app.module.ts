import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';  
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module'; // ← Módulo Prisma
import { AuthModule } from './auth/auth.module'; // ← Módulo de autenticação
import { GuestsModule } from './guests/guests.module'; // ← Adicionar
import { ReservationsModule } from './reservations/reservation.module'; // ← Módulo de reservas
import { CheckModule } from './check/check.module'; // ← Módulo de check-in/check-out
import { CompaniesModule } from './companies/companies.module'; // ← Módulo de empresas
import { MaintenanceModule } from './maintenance/maintenance.module'; // ← Módulo de manutenção
import { HousekeepingModule } from './housekeeping/housekeeping.module'; // ← Módulo de governança
import { FinancialModule } from './financial/financial.module'; // ← Módulo financeiro
import { RoomsModule } from './rooms/rooms.module'; // ← Módulo de quartos
import { DashboardModule } from './dashboard/dashboard.module'; // ← Módulo de dashboard
import { ReportsModule } from './reports/reports.module'; // ← Módulo de relatórios

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([{  // ← Configuração global do rate limiting
      ttl: 60000,
      limit: 10,
    }]),
    PrismaModule,    // ← Módulo global do Prisma
    AuthModule,
    GuestsModule,
    ReservationsModule,
    CheckModule,
    CompaniesModule,
    MaintenanceModule,
    HousekeepingModule,
    FinancialModule,
    RoomsModule,
    DashboardModule,
    ReportsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}