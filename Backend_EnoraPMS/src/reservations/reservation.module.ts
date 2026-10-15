import { Module } from '@nestjs/common';
import { ReservationsController } from './reservation.controller';
import { ReservationsService } from './reservation.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ReservationsController],
  providers: [ReservationsService], 
})
export class ReservationsModule {}