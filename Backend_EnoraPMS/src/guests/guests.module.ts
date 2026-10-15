import { Module } from '@nestjs/common';
import { GuestsController } from './guests.controller';
import { GuestsService } from './guests.service';
import { PrismaService } from '../prisma/prisma.service'; // Injeção do conector do banco
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [ThrottlerModule],
  controllers: [GuestsController],
  providers: [GuestsService, PrismaService],
})
export class GuestsModule {}