import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { HousekeepingService } from './housekeeping.service';
import { CreateHousekeepingTaskDto, UpdateHousekeepingTaskDto } from './housekeeping.dto';

@Controller('housekeeping')
export class HousekeepingController {
  constructor(private readonly housekeepingService: HousekeepingService) {}

  // GET /housekeeping - Tarefas do dia atual
  @Get()
  async getTodayTasks() {
    return this.housekeepingService.getTodayTasks();
  }

  // GET /housekeeping/stats - Estatísticas do dia
  @Get('stats')
  async getStats() {
    return this.housekeepingService.getTodayStats();
  }

  // GET /housekeeping/all - Todas as tarefas
  @Get('all')
  async getAllTasks() {
    return this.housekeepingService.getAllTasks();
  }

  // GET /housekeeping/:id - Obter tarefa específica
  @Get(':id')
  async getTaskById(@Param('id') id: string) {
    return this.housekeepingService.getTaskById(parseInt(id));
  }

  // POST /housekeeping - Criar nova tarefa
  @Post()
  async createTask(@Body() payload: CreateHousekeepingTaskDto) {
    return this.housekeepingService.createTask(payload);
  }

  // PATCH /housekeeping/:id - Atualizar tarefa
  @Patch(':id')
  async updateTask(
    @Param('id') id: string,
    @Body() payload: UpdateHousekeepingTaskDto,
  ) {
    return this.housekeepingService.updateTask(parseInt(id), payload);
  }

  // DELETE /housekeeping/:id - Deletar tarefa
  @Delete(':id')
  async deleteTask(@Param('id') id: string) {
    return this.housekeepingService.deleteTask(parseInt(id));
  }
}
