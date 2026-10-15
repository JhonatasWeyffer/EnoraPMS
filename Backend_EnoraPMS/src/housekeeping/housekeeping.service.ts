import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHousekeepingTaskDto, UpdateHousekeepingTaskDto } from './housekeeping.dto';
import { StatusGovernanca, PrioridadeManutencao } from '@prisma/client';

@Injectable()
export class HousekeepingService {
  constructor(private prisma: PrismaService) {}

  // Obter tarefas do dia atual + Pendências de dias anteriores
  async getTodayTasks() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);

    return this.prisma.governanca.findMany({
      where: {
        OR: [
          // 1. Mostrar todas as tarefas não concluídas (Sujo, Em Limpeza) que deveriam 
          // ter sido feitas até ao final do dia de hoje (isto inclui TUDO o que ficou atrasado de ontem)
          {
            status: { in: ['PENDENTE', 'EM_ANDAMENTO'] },
            dataPrevista: { lt: endOfDay },
          },
          // 2. Mostrar as tarefas que foram concluídas ('Pronto') APENAS no dia de hoje,
          // para que a governanta possa ver o que já fez hoje. Amanhã elas desaparecem.
          {
            status: 'CONCLUIDA',
            dataPrevista: { gte: startOfDay, lt: endOfDay },
          }
        ]
      },
      include: {
        quarto: true, 
      },
      orderBy: [
        { prioridade: 'desc' }, // Traz as tarefas ALTA primeiro
        { criadoEm: 'desc' }
      ],
    });
  }

  // Criar nova tarefa
  async createTask(data: CreateHousekeepingTaskDto) {
    return this.prisma.governanca.create({
      data: {
        quartoId: Number(data.quartoId),
        tipo: data.tipo || 'Check-out',
        descricao: data.descricao || '',
        status: data.status || StatusGovernanca.PENDENTE,
        prioridade: data.prioridade || PrioridadeManutencao.MEDIA,
        dataPrevista: data.dataPrevista ? new Date(data.dataPrevista) : new Date(),
      },
      include: { quarto: true },
    });
  }

  // Obter tarefa por ID
  async getTaskById(id: number) {
    return this.prisma.governanca.findUnique({
      where: { id },
      include: { quarto: true },
    });
  }

  // Atualizar tarefa
  async updateTask(id: number, data: UpdateHousekeepingTaskDto) {
    const updateData: any = { ...data };
    
    if (data.quartoId) updateData.quartoId = Number(data.quartoId);
    if (data.dataPrevista) updateData.dataPrevista = new Date(data.dataPrevista);

    return this.prisma.governanca.update({
      where: { id },
      data: updateData,
      include: { quarto: true },
    });
  }

  // Deletar tarefa
  async deleteTask(id: number) {
    return this.prisma.governanca.delete({
      where: { id },
    });
  }

  // Obter todas as tarefas (para histórico/relatórios)
  async getAllTasks() {
    return this.prisma.governanca.findMany({
      include: { quarto: true },
      orderBy: { dataPrevista: 'desc' },
    });
  }

  // Obter estatísticas do dia adaptadas aos Enums do Prisma
  async getTodayStats() {
    const tasks = await this.getTodayTasks();
    
    return {
      total: tasks.length,
      pendente: tasks.filter(t => t.status === 'PENDENTE').length,
      em_limpeza: tasks.filter(t => t.status === 'EM_ANDAMENTO').length,
      pronto: tasks.filter(t => t.status === 'CONCLUIDA').length,
    };
  }
}