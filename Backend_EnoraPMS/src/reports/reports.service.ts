import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardSummary(startDateStr?: string, endDateStr?: string) {
    const endDate = endDateStr ? dayjs.utc(endDateStr).endOf('day').toDate() : dayjs().toDate();
    const startDate = startDateStr ? dayjs.utc(startDateStr).startOf('day').toDate() : dayjs().subtract(30, 'day').toDate();
    const startOfToday = dayjs().startOf('day').toDate();

    // 1. KPIs Base
    const [
      reservasTotal, reservasHoje,
      financeiroTotal, financeiroHoje,
      manutencaoTotal, manutencaoHoje,
      governancaTotal, governancaHoje,
      receitas, despesas
    ] = await Promise.all([
      this.prisma.reserva.count({ where: { criadoEm: { gte: startDate, lte: endDate } } }),
      this.prisma.reserva.count({ where: { criadoEm: { gte: startOfToday } } }),
      this.prisma.financeiro.count({ where: { criadoEm: { gte: startDate, lte: endDate } } }),
      this.prisma.financeiro.count({ where: { criadoEm: { gte: startOfToday } } }),
      this.prisma.manutencao.count({ where: { criadoEm: { gte: startDate, lte: endDate } } }),
      this.prisma.manutencao.count({ where: { criadoEm: { gte: startOfToday } } }),
      this.prisma.governanca.count({ where: { criadoEm: { gte: startDate, lte: endDate } } }),
      this.prisma.governanca.count({ where: { criadoEm: { gte: startOfToday } } }),
      this.prisma.financeiro.aggregate({ where: { tipo: 'RECEITA', criadoEm: { gte: startDate, lte: endDate } }, _sum: { valor: true } }),
      this.prisma.financeiro.aggregate({ where: { tipo: 'DESPESA', criadoEm: { gte: startDate, lte: endDate } }, _sum: { valor: true } })
    ]);

    // 2. Gráfico Semanal
    const startOf7Days = dayjs().subtract(6, 'day').startOf('day').toDate();
    const reservas7Dias = await this.prisma.reserva.findMany({
      where: { criadoEm: { gte: startOf7Days } },
      select: { criadoEm: true }
    });

    const semanalLabels: string[] = [];
    const semanalData: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const targetDay = dayjs().subtract(i, 'day');
      semanalLabels.push(targetDay.format('DD/MM'));
      const count = reservas7Dias.filter(r => dayjs(r.criadoEm).isSame(targetDay, 'day')).length;
      semanalData.push(count);
    }

    // 3. Gráfico de Suporte
    const manutencoesPrioridade = await this.prisma.manutencao.groupBy({
      by: ['prioridade'],
      _count: { id: true },
      where: { criadoEm: { gte: startDate, lte: endDate } }
    });

    const suporteLabels = ['Alta', 'Média', 'Baixa'];
    const suporteData = [0, 0, 0];
    manutencoesPrioridade.forEach(m => {
      if (m.prioridade === 'ALTA') suporteData[0] = m._count.id;
      if (m.prioridade === 'MEDIA') suporteData[1] = m._count.id;
      if (m.prioridade === 'BAIXA') suporteData[2] = m._count.id;
    });

    // 4. Linha do Tempo de Logs (AGORA BLINDADA COM O PERÍODO ESCOLHIDO)
    const [ultimasReservas, ultimosPagamentos, ultimasManutencoes, ultimasGovernancas] = await Promise.all([
      this.prisma.reserva.findMany({ where: { criadoEm: { gte: startDate, lte: endDate } }, take: 50, orderBy: { criadoEm: 'desc' }, include: { quarto: true } }),
      this.prisma.financeiro.findMany({ where: { criadoEm: { gte: startDate, lte: endDate } }, take: 50, orderBy: { criadoEm: 'desc' } }),
      this.prisma.manutencao.findMany({ where: { criadoEm: { gte: startDate, lte: endDate } }, take: 50, orderBy: { criadoEm: 'desc' }, include: { quarto: true } }),
      this.prisma.governanca.findMany({ where: { criadoEm: { gte: startDate, lte: endDate } }, take: 50, orderBy: { criadoEm: 'desc' }, include: { quarto: true } })
    ]);

    const rawLogs = [
      ...ultimasReservas.map(r => ({ data: r.criadoEm, msg: `Nova reserva [${r.numeroReserva}] - Quarto ${r.quarto?.numero || 'N/A'}`, tipo: 'check-in' })),
      ...ultimosPagamentos.map(f => ({ data: f.criadoEm, msg: `Registro Financeiro: ${f.descricao} (R$ ${Number(f.valor).toFixed(2)})`, tipo: 'financeiro' })),
      ...ultimasManutencoes.map(m => ({ data: m.criadoEm, msg: `Manutenção: ${m.tipo} - Quarto ${m.quarto?.numero}`, tipo: 'manutencao' })),
      ...ultimasGovernancas.map(g => ({ data: g.criadoEm, msg: `Governança: ${g.tipo} - Quarto ${g.quarto?.numero}`, tipo: 'limpeza' }))
    ];

    // Agora enviamos um pool muito maior de dados para o React paginar
    const logs = rawLogs.sort((a, b) => b.data.getTime() - a.data.getTime()).slice(0, 100).map((log, index) => ({
      id: index + 1,
      time: dayjs(log.data).format('HH:mm - DD/MM'),
      msg: log.msg,
      tipo: log.tipo
    }));

    const modulos = [
      { nome: 'Reservas', total: reservasTotal },
      { nome: 'Financeiro', total: financeiroTotal },
      { nome: 'Manutenção', total: manutencaoTotal },
      { nome: 'Governança', total: governancaTotal }
    ].sort((a, b) => b.total - a.total);

    return {
      kpis: {
        totalEventos: reservasTotal + financeiroTotal + manutencaoTotal + governancaTotal,
        hoje: reservasHoje + financeiroHoje + manutencaoHoje + governancaHoje,
        atualizacao: dayjs().format('HH:mm'),
        topModulo: modulos[0].nome
      },
      charts: {
        modulos: [reservasTotal, financeiroTotal, governancaTotal, manutencaoTotal], 
        financeiro: [Number(receitas._sum?.valor || 0), Number(despesas._sum?.valor || 0)],
        semanal: { labels: semanalLabels, data: semanalData },
        suporte: { labels: suporteLabels, data: suporteData }
      },
      logs
    };
  }
}