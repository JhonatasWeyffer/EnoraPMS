import { Module } from '@nestjs/common';
import { CheckController } from './check.controller';
import { CheckService } from './check.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CheckController],
  providers: [CheckService],
})
export class CheckModule {}