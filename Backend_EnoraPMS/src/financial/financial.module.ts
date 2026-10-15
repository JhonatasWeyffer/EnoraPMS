import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FinancialController } from './financial.controller';
import { FinancialService } from './financial.service';

@Module({
  controllers: [FinancialController],
  providers: [FinancialService, PrismaService],
})
export class FinancialModule {}
