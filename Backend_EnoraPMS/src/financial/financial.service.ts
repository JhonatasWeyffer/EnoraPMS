import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './financial.dto';

@Injectable()
export class FinancialService {
  constructor(private prisma: PrismaService) {}

  // =========================================================================
  // CAIXA DIÁRIO (CORRIGIDO: HORA EXATA E PROTEÇÃO CONTRA DUPLICIDADE)
  // =========================================================================
  async getTodayTransactions() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);

    // 1. Busca TODAS as transações do Livro Caixa (Manuais + Automáticas do Check-in/out)
    const registrosCaixa = await this.prisma.financeiro.findMany({
      where: {
        criadoEm: { gte: startOfDay, lt: endOfDay },
      },
      include: { reserva: { include: { quarto: true } } }
    });

    // Filtro de Segurança: Extrai IDs processados para evitar que a receita seja contada duas vezes
    const reservasProcessadas = registrosCaixa.map(r => r.reservaId).filter(Boolean);

    // 2. Busca Reservas antigas/órfãs que foram pagas mas não geraram log no Financeiro
    const reservasOrfas = await this.prisma.reserva.findMany({
      where: {
        id: { notIn: reservasProcessadas as string[] },
        statusPagamento: { in: ['pago', 'PAGO', 'Pago'] },
        OR: [
          { pagoEm: { gte: startOfDay, lt: endOfDay } },
          { atualizadoEm: { gte: startOfDay, lt: endOfDay } }
        ]
      },
      include: { quarto: true }
    });

    // 3. Mapeia e resgata a HORA EXATA formatada (HH:mm) para o Frontend
    const mappedCaixa = registrosCaixa.map(c => {
      const d = c.criadoEm;
      return {
        id: c.id,
        descricao: c.descricao,
        valor: c.valor,
        metodo: c.metodo,
        tipo: c.tipo,
        criadoEm: d,
        time: `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`,
        reservaId: c.reservaId
      };
    });

    const mappedReservas = reservasOrfas.map(r => {
      // O pagoEm perdeu a hora no banco, mas o atualizadoEm guardou o clique exato!
      const d = r.atualizadoEm; 
      return {
        id: r.id,
        descricao: `Reserva do Quarto: ${r.quarto?.numero || 'Sem Quarto atribuído'}`,
        valor: r.valorTotal || 0,
        metodo: r.formaPagamento || 'Não informado',
        tipo: 'RECEITA',
        criadoEm: d,
        time: `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`,
        reservaId: r.id
      };
    });

    // 4. Une tudo e ordena com precisão matemática (do MAIS RECENTE para o MAIS ANTIGO)
    const items = [...mappedCaixa, ...mappedReservas].sort(
      (a, b) => b.criadoEm.getTime() - a.criadoEm.getTime()
    );

    const total = items.reduce((sum, item) => sum + Number(item.valor), 0);
    
    return { items, total };
  }

  async createTransaction(data: CreateTransactionDto) {
    return this.prisma.financeiro.create({ 
      data: {
        descricao: data.descricao,
        valor: data.valor,
        metodo: data.metodo,
        tipo: data.tipo,
        reservaId: data.reservaId
      }
    });
  }

  async updateTransaction(id: number, data: CreateTransactionDto) {
    const transacao = await this.prisma.financeiro.findUnique({ where: { id } });
    if (!transacao) throw new NotFoundException('Lançamento não encontrado no banco.');

    return this.prisma.financeiro.update({
      where: { id },
      data: {
        descricao: data.descricao,
        valor: data.valor,
        metodo: data.metodo,
        tipo: data.tipo,
        reservaId: data.reservaId
      }
    });
  }

  async getAllTransactions() {
    // Busca manuais
    const manualItems = await this.prisma.financeiro.findMany();
    
    // Busca reservas pagas históricas
    const reservasPagas = await this.prisma.reserva.findMany({
      where: { statusPagamento: { in: ['pago', 'PAGO', 'Pago'] } },
      include: { quarto: true }
    });

    const mappedReservas = reservasPagas.map(r => ({
      id: r.id,
      descricao: `Reserva do Quarto: ${r.quarto?.numero || 'Sem Quarto atribuído'}`,
      valor: r.valorTotal || 0,
      metodo: r.formaPagamento || 'Não informado',
      tipo: 'RECEITA',
      criadoEm: r.pagoEm || r.atualizadoEm,
      reservaId: r.id
    }));

    return [...manualItems, ...mappedReservas].sort(
      (a, b) => b.criadoEm.getTime() - a.criadoEm.getTime()
    );
  }

  // =========================================================================
  // COCKPIT OPERACIONAL: CALCULADO PELO FLUXO REAL DE ENTRADA/SAÍDA
  // =========================================================================
  async getHotelOperationalStatus() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    const endOfDayUTC = new Date(`${ano}-${mes}-${dia}T23:59:59.999Z`);

    // 1. CHECK-INS PENDENTES
    // Mantemos a regra: Quem tem que entrar hoje (ou está atrasado)
    const checkInsCount = await this.prisma.reserva.count({
      where: {
        situacao: 'CRIADA',
        dataEntrada: { lte: endOfDayUTC }
      }
    });

    // 2. CHECK-OUTS AGUARDADOS (REGRA ALTERADA)
    // Agora o sistema ignora a data de saída. 
    // Fez check-in ('EM_ANDAMENTO')? Conta imediatamente como pendente de Check-out.
    const checkOutsCount = await this.prisma.reserva.count({
      where: {
        situacao: 'EM_ANDAMENTO' // <-- A trava de 'dataSaida' foi removida
      }
    });

    // 3. TAXA DE OCUPAÇÃO
    const totalQuartos = await this.prisma.quarto.count();
    const quartosOcupados = await this.prisma.reserva.count({
      where: {
        situacao: 'EM_ANDAMENTO'
      }
    });

    const ocupacaoPercent = totalQuartos > 0 ? Math.round((quartosOcupados / totalQuartos) * 100) : 0;

    return {
      checkIns: checkInsCount,
      checkOuts: checkOutsCount,
      ocupacao: ocupacaoPercent
    };
  }
  // =========================================================================
  // LEMBRETES SALVOS DIRETAMENTE NO BANCO DE DADOS POSTGRESQL (CORRIGIDO)
  // =========================================================================
  async getRecentReminders() {
    return this.prisma.lembreteTurno.findMany({
      take: 10,
      orderBy: { criadoEm: 'desc' },
    });
  }

  async createReminder(data: { titulo?: string; descricao: string }) {
    if (!data.descricao || data.descricao.trim() === '') {
      throw new Error('A descrição do lembrete não pode ser vazia.');
    }

    return this.prisma.lembreteTurno.create({
      data: {
        titulo: data.titulo || 'Sem título',
        descricao: data.descricao,
      },
    });
  }
}