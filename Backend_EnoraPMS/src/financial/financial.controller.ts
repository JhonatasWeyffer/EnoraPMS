import { Body, Controller, Get, Post, Put, Param } from '@nestjs/common';
import { FinancialService } from './financial.service';
import { CreateTransactionDto } from './financial.dto';

@Controller('financial')
export class FinancialController {
  constructor(private readonly financialService: FinancialService) {}

  @Get('today')
  async getToday() {
    const result = await this.financialService.getTodayTransactions();
    const items = result.items.map((item) => ({
      id: item.id,
      descricao: item.descricao,
      valor: Number(item.valor),
      metodo: item.metodo,
      tipo: item.tipo,
      time: item.criadoEm ? item.criadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null,
    }));

    return { items, total: result.total };
  }

  // 1. ENDPOINT DO COCKPIT OPERACIONAL
  @Get('hotel-status')
  async getHotelStatus() {
    return this.financialService.getHotelOperationalStatus();
  }

  // 2. ENDPOINTS DOS LEMBRETES DO TURNO
  @Get('turn-reminders')
  async getTurnReminders() {
    return this.financialService.getRecentReminders();
  }

  @Post('turn-reminders')
  async createTurnReminder(@Body() payload: { titulo?: string; descricao: string }) {
    return this.financialService.createReminder(payload);
  }

  // 3. ENDPOINTS DE TRANSAÇÕES FINANCEIRAS (ADICIONADO O PUT PARA EDIÇÃO)
  @Post()
  async createTransaction(@Body() payload: CreateTransactionDto) {
    const data = {
      descricao: payload.descricao,
      valor: Number(payload.valor),
      metodo: payload.metodo,
      tipo: payload.tipo,
      reservaId: payload.reservaId,
    };
    return this.financialService.createTransaction(data);
  }

  @Put(':id')
  async updateTransaction(@Param('id') id: string, @Body() payload: CreateTransactionDto) {
    return this.financialService.updateTransaction(Number(id), payload);
  }

  @Get()
  async getAll() {
    return this.financialService.getAllTransactions();
  }
}