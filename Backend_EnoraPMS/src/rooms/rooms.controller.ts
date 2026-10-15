import { Controller, Get, Query, Param } from '@nestjs/common';
import { RoomsService } from './rooms.service';


@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  // GET /rooms?date=YYYY-MM-DD
  // Puxa os quartos e seus status calculados em tempo real para a data especificada
  @Get()
  async getRooms(@Query('date') date: string) {
    return this.roomsService.getRoomsByDate(date); 
  }

  

  @Get('lista-simples')
  async listarQuartosFisicos() {
    return this.roomsService.getQuartosSimples();
  }

  // GET /rooms/reservation-map?start=YYYY-MM-DD
  // Gera a matriz de ocupação de 7 dias baseada em reservas, governança e manutenção
  @Get('reservation-map')
  async getReservationMap(@Query('start') start: string) {
    return this.roomsService.getReservationMap(start);
  }

  
  // GET /rooms/:roomNumber/details?date=YYYY-MM-DD
  // Fornece detalhes completos de um quarto específico para a data fornecida
  @Get(':roomNumber/details')
  async getRoomDetails(
    @Param('roomNumber') roomNumber: string,
    @Query('date') date: string
  ) {
    return this.roomsService.getRoomDetailsByDate(roomNumber, date);
  }
}
