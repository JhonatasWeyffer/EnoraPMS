import { Module } from '@nestjs/common';
import { FnrhController } from './fnrh.controller';
import { FnrhService } from './fnrh.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FnrhController],
  providers: [FnrhService],
  exports: [FnrhService],
})
export class FnrhModule {}
