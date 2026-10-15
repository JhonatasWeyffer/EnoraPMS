import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Torna o PrismaService disponível em toda aplicação sem precisar reimportar o módulo
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // Exporta o service para que outros módulos possam injetá-lo
})
export class PrismaModule {}