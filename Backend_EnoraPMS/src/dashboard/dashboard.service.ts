import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import 'dayjs/locale/pt-br';

dayjs.extend(utc);
dayjs.locale('pt-br');

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary() {
    // 1. Blindagem de Fuso Horário (Garante que os limites de tempo são absolutos)
    const todayStr = dayjs().format('YYYY-MM-DD');
    const startOfToday = new Date(`${todayStr}T00:00:00.000Z`);
    const endOfToday = new Date(`${todayStr}T23:59:59.999Z`);

    // 2. STATS: Consultas paralelas
    const [
      totalQuartos,
      ocupados,
      entradasHoje,
      saidasHoje,
      pendencias,
      emLimpeza
    ] = await Promise.all([
      this.prisma.quarto.count(),
      this.prisma.reserva.count({ where: { situacao: 'EM_ANDAMENTO' } }),
      this.prisma.reserva.count({
        where: { 
          dataEntrada: { gte: startOfToday, lte: endOfToday }, 
          situacao: { notIn: ['CANCELADA', 'NOSHOW'] } 
        }
      }),
      this.prisma.reserva.count({
        where: { 
          OR: [
            { dataSaida: { gte: startOfToday, lte: endOfToday } },
            // Captura também quem fez check-out antecipado hoje
            { atualizadoEm: { gte: startOfToday, lte: endOfToday }, situacao: 'CONCLUIDA' }
          ],
          situacao: { notIn: ['CANCELADA', 'NOSHOW'] }
        }
      }),
      this.prisma.reserva.count({
        where: {
          OR: [
            { situacao: 'CRIADA', dataEntrada: { lte: endOfToday } },
            { situacao: 'EM_ANDAMENTO', dataSaida: { lte: endOfToday } }
          ]
        }
      }),
      // Tratamento de segurança caso a governança ainda não esteja populada
      this.prisma.governanca?.count({ where: { status: 'PENDENTE' } }).catch(() => 0)
    ]);

    const taxaOcupacao = totalQuartos > 0 ? Math.round((ocupados / totalQuartos) * 100) : 0;
    const livres = totalQuartos - ocupados;

    // Busca movimentações recentes para a tabela
    const rawMovimentacoes = await this.prisma.reserva.findMany({
      take: 10,
      orderBy: { atualizadoEm: 'desc' },
      include: {
        quarto: true,
        hospedes: { include: { hospede: true }, take: 1 }
      }
    });

    // =========================================================================
    // CORREÇÃO BUG-02: GRÁFICO SEMANAL (ELIMINAÇÃO DE OCUPAÇÃO FANTASMA)
    // =========================================================================
    const labelsGrafico: string[] = [];
    const dadosGrafico: number[] = [];

    for (let i = 0; i < 7; i++) {
      const dia = dayjs().add(i, 'day');
      labelsGrafico.push(dia.format('ddd (DD/MM)'));

      const diaStart = dia.startOf('day').toDate();
      const diaEnd = dia.endOf('day').toDate();

      const ocupacaoNoDia = await this.prisma.reserva.count({
        where: {
          // AQUI ESTÁ A CHAVE: Só conta como ocupado no futuro quem REALMENTE está 
          // hospedado ou pendente de entrar. Se está CONCLUÍDA, liberta a grade.
          situacao: { in: ['CRIADA', 'EM_ANDAMENTO'] },
          dataEntrada: { lte: diaEnd },
          dataSaida: { gt: diaStart } // Hóspede dorme na noite de diaStart
        }
      });
      
      const ocupacaoDiaPorcentagem = totalQuartos > 0 ? Math.round((ocupacaoNoDia / totalQuartos) * 100) : 0;
      dadosGrafico.push(ocupacaoDiaPorcentagem);
    }

    return {
      stats: {
        entradas: entradasHoje,
        saidas: saidasHoje,
        ocupacao: `${taxaOcupacao}%`,
        pendencias,
        livres,
        limpeza: emLimpeza || 0
      },
      movimentacoes: this.mapReservationsToFrontend(rawMovimentacoes),
      grafico: {
        labels: labelsGrafico,
        dados: dadosGrafico
      }
    };
  }

  async searchGuests(query: string) {
    const rawMovimentacoes = await this.prisma.reserva.findMany({
      where: {
        OR: [
          { numeroReserva: { contains: query, mode: 'insensitive' } },
          {
            hospedes: {
              some: {
                hospede: { nome: { contains: query, mode: 'insensitive' } }
              }
            }
          }
        ]
      },
      take: 5,
      orderBy: { atualizadoEm: 'desc' },
      include: {
        quarto: true,
        hospedes: { include: { hospede: true }, take: 1 }
      }
    });

    return { movimentacoes: this.mapReservationsToFrontend(rawMovimentacoes) };
  }

  // =========================================================================
  // CORREÇÃO BUG-01: MAPEAMENTO DA DATA REAL DE SAÍDA NA TABELA
  // =========================================================================
  private mapReservationsToFrontend(reservas: any[]) {
    return reservas.map(r => {
      // Se a reserva sofreu check-out antecipado/encerrada, o registro de verdade 
      // passa a ser o momento exato da atualização (atualizadoEm).
      const finalizada = r.situacao === 'CONCLUIDA';
      const dataSaidaReal = finalizada ? r.atualizadoEm : r.dataSaida;
      
      return {
        reserva: r.numeroReserva,
        status: r.situacao,
        nome: r.hospedes?.[0]?.hospede?.nome || 'Não informado',
        quarto: r.quarto?.numero || 'S/N',
        // Se já encerrou, mostra a data e a hora exata da ação no balcão.
        // Se ainda está por vir, mostra apenas a data prevista de contrato.
        saida: finalizada 
          ? dayjs(dataSaidaReal).format('DD/MM/YYYY [às] HH:mm') 
          : dayjs(dataSaidaReal).format('DD/MM/YYYY')
      };
    });
  }
}