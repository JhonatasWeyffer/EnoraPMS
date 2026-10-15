import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import {
  BuscarHospedeDto,
  CriarReservaDto,
  VincularHospedeDto,
} from './reservation.security.dto';
import { 
  ReservationsService, 
  PatchedUpdateReservaDto, 
  StarsStatusHospedeDto 
} from './reservation.service';

/**
 * Controller de Reservas (SolimõesPMS)
 * - Responsabilidade Única: Receber requisições HTTP e rotear para o Service.
 * - Proteção JWT global ativada.
 */
@Controller('reservations')
@UseGuards(AuthGuard('jwt'))
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post('buscar-hospede')
  async buscarHospede(@Body() dto: BuscarHospedeDto) {
    return this.reservationsService.buscarHospede(dto);
  }

  @Get('available-rooms')
  async availableRooms(
    @Query('data_entrada') dataEntrada: string,
    @Query('data_saida') dataSaida: string,
    @Query('exclude_reserva_id') excludeId?: string,
  ) {
    return this.reservationsService.availableRooms(dataEntrada, dataSaida, excludeId);
  }

  @Get()
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('situacao') situacao?: string,
    @Query('dataEntrada') dataEntrada?: string,
    @Query('dataSaida') dataSaida?: string,
    @Query('search') search?: string,
  ) {
    return this.reservationsService.findAll(
      Number(page), 
      Number(limit), 
      situacao, 
      dataEntrada, 
      dataSaida, 
      search
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.reservationsService.findOne(id);
  }

  @Post()
  async create(@Req() req: Request, @Body() dto: CriarReservaDto) {
    const operadorId = (req as any).user.sub;
    return this.reservationsService.create(dto, operadorId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() dto: PatchedUpdateReservaDto,
  ) {
    const operadorId = (req as any).user.sub;
    return this.reservationsService.update(id, dto, operadorId);
  }

  @Patch(':id/cancel')
  async cancel(@Param('id') id: string, @Req() req: Request) {
    const operadorId = (req as any).user.sub;
    return this.reservationsService.cancel(id, operadorId);
  }

  @Post(':id/pre-checkin')
  async preCheckin(@Param('id') id: string) {
    return this.reservationsService.preCheckin(id);
  }

  @Post(':id/guests')
  async addGuest(@Param('id') id: string, @Body() dto: VincularHospedeDto) {
    return this.reservationsService.addGuest(id, dto);
  }

  @Delete(':id/guests/:guestId')
  async removeGuest(@Param('id') id: string, @Param('guestId') guestId: string) {
    return this.reservationsService.removeGuest(id, guestId);
  }

  @Patch(':id/guests/:guestId/status')
  async updateGuestStatus(
    @Param('id') id: string,
    @Param('guestId') guestId: string,
    @Body() dto: StarsStatusHospedeDto,
  ) {
    return this.reservationsService.updateGuestStatus(id, guestId, dto);
  }
}