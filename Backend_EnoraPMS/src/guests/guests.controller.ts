import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { GuestsService } from './guests.service';
import { CriarPessoaDto, AtualizarPessoaDto } from './guests.dto';
import { Hospede } from '@prisma/client';
import type { Request } from 'express';
import { AuthGuard } from '@nestjs/passport'; 

@Controller('guests')
@UseGuards(AuthGuard('jwt')) 
export class GuestsController {
  constructor(private readonly guestsService: GuestsService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async create(
    @Req() req: Request,
    @Body() dto: CriarPessoaDto,
  ): Promise<{ pessoa_id: string }> {
    // Correção: O cast para 'any' deve ser no 'req' inteiro antes de ler '.user'
    const operadorId = (req as any).user.sub; 
    return this.guestsService.create(dto, operadorId);
  }

  @Get()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async findAll(): Promise<Hospede[]> {
    return this.guestsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Hospede> {
    return this.guestsService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() dto: AtualizarPessoaDto,
  ): Promise<{ pessoa_id: string }> {
    const operadorId = (req as any).user.sub;
    return this.guestsService.update(id, dto, operadorId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.guestsService.remove(id);
  }
}