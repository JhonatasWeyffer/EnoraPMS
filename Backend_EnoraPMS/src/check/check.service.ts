import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StatusHospede, StatusReserva } from '@prisma/client';

@Injectable()
export class CheckService {
  private readonly logger = new Logger(CheckService.name);

  constructor(private prisma: PrismaService) {}

  // Busca o nome real do operador para auditoria
  private async getOperadorNome(operadorId: number): Promise<string> {
    const op = await this.prisma.usuario.findUnique({ where: { id: operadorId }, select: { nome: true } });
    return op ? op.nome : 'Sistema';
  }

  async preCheckin(hospedeId: string, operadorId: number) {
    const guest = await this.findReservationGuestOrFail(hospedeId);
    const nomeOperador = await this.getOperadorNome(operadorId);

    if (guest.situacao === StatusHospede.PRECHECKIN_REALIZADO) {
      throw new BadRequestException('Pré-check-in já realizado.');
    }
    
    // CORREÇÃO FNRH: Validação com os status oficias da FNRH v2
    if (
      guest.situacao !== StatusHospede.PRECHECKIN_NAOVINCULADO && 
      guest.situacao !== StatusHospede.PRECHECKIN_PENDENTE
    ) {
      throw new BadRequestException('Pré-check-in não permitido no status atual.');
    }

    const updated = await this.prisma.reservaHospede.update({
      where: { id: hospedeId },
      data: { situacao: StatusHospede.PRECHECKIN_REALIZADO, preCheckinEm: new Date() },
      include: this.guestInclude(),
    });

    this.logger.log(`[AUDITORIA] Ação: PRÉ_CHECKIN | Operador: [${nomeOperador}] | Reserva: [${updated.reserva.numeroReserva}] | Hóspede: [${updated.hospede.nome}]`);

    await this.avaliarSituacaoReserva(updated.reservaId);
    return updated;
  }

  async checkin(
    hospedeId: string, 
    operadorId: number, 
    payload?: { pagamento?: { valor: number, forma: string } }
  ) {
    const guest = await this.findReservationGuestOrFail(hospedeId);
    const nomeOperador = await this.getOperadorNome(operadorId);

    if (guest.situacao === StatusHospede.CHECKIN_REALIZADO) {
      throw new BadRequestException('Check-in já foi realizado.');
    }

    // Validação de Segurança no Backend
    if (payload?.pagamento) {
      if (!payload.pagamento.valor || payload.pagamento.valor <= 0) {
        throw new BadRequestException('Valor do pagamento não pode ser nulo ou zero.');
      }
      if (!payload.pagamento.forma) {
        throw new BadRequestException('Forma de pagamento é obrigatória.');
      }
    }

    // Transação: Garante que Hóspede e Caixa Diário fiquem sincronizados
    const updated = await this.prisma.$transaction(async (tx) => {
      // A. Efetiva o Check-in
      const reservaHospede = await tx.reservaHospede.update({
        where: { id: hospedeId },
        data: { situacao: StatusHospede.CHECKIN_REALIZADO, checkinEm: new Date() },
        include: this.guestInclude(),
      });

      // B. Grava a Transação Financeira Permanentemente
      if (payload?.pagamento) {
        // Atualiza a Reserva
        await tx.reserva.update({
          where: { id: reservaHospede.reservaId },
          data: {
            valorTotal: payload.pagamento.valor,
            formaPagamento: payload.pagamento.forma,
            statusPagamento: 'pago',
            pagoEm: new Date()
          }
        });

        // INSERÇÃO DIRETA NO LIVRO CAIXA (Tabela Financeiro)
        await tx.financeiro.create({
          data: {
            descricao: `Adiantamento Check-in - Reserva ${reservaHospede.reserva.numeroReserva}`,
            valor: payload.pagamento.valor,
            metodo: payload.pagamento.forma,
            tipo: 'RECEITA',
            reservaId: reservaHospede.reservaId
          }
        });
      }

      return reservaHospede;
    });

    this.logger.log(`[AUDITORIA] CHECKIN | Operador: [${nomeOperador}] | Reserva: [${updated.reserva.numeroReserva}]`);
    await this.avaliarSituacaoReserva(updated.reservaId);
    return updated;
  }

  async checkout(
    hospedeId: string, 
    operadorId: number, 
    payload?: { pagamento?: { valor: number, forma: string } }
  ) {
    const guest = await this.findReservationGuestOrFail(hospedeId);
    const nomeOperador = await this.getOperadorNome(operadorId);

    if (guest.situacao === StatusHospede.CHECKOUT_REALIZADO) {
      throw new BadRequestException('Check-out já foi realizado.');
    }
    if (guest.situacao !== StatusHospede.CHECKIN_REALIZADO) {
      throw new BadRequestException('Check-out não permitido sem check-in.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const reservaHospede = await tx.reservaHospede.update({
        where: { id: hospedeId },
        data: { situacao: StatusHospede.CHECKOUT_REALIZADO, checkoutEm: new Date() },
        include: this.guestInclude(),
      });

      if (payload?.pagamento) {
        await tx.reserva.update({
          where: { id: reservaHospede.reservaId },
          data: {
            valorTotal: payload.pagamento.valor,
            formaPagamento: payload.pagamento.forma,
            statusPagamento: 'pago',
            pagoEm: new Date()
          }
        });

        await tx.financeiro.create({
          data: {
            descricao: `Pagamento Check-out - Reserva ${reservaHospede.reserva.numeroReserva}`,
            valor: payload.pagamento.valor,
            metodo: payload.pagamento.forma,
            tipo: 'RECEITA',
            reservaId: reservaHospede.reservaId
          }
        });
      }

      return reservaHospede;
    });

    this.logger.log(`[AUDITORIA] CHECKOUT | Operador: [${nomeOperador}] | Quarto: [${updated.reserva.quartoId}]`);
    await this.avaliarSituacaoReserva(updated.reservaId);
    return updated;
  }

  async noShow(hospedeId: string, operador: string = 'Usuario Desconhecido') {
    const guest = await this.findReservationGuestOrFail(hospedeId);

    if (guest.situacao === StatusHospede.NOSHOW) {
      throw new BadRequestException('Hóspede já está como No-show.');
    }
    if (
      guest.situacao !== StatusHospede.PRECHECKIN_PENDENTE &&
      guest.situacao !== StatusHospede.PRECHECKIN_REALIZADO &&
      guest.situacao !== StatusHospede.PRECHECKIN_NAOVINCULADO
    ) {
      throw new BadRequestException(
        'No-show não permitido no status atual.',
      );
    }

    const reserva = await this.prisma.reserva.findUnique({
      where: { id: guest.reservaId },
    });
    if (!reserva) {
      throw new NotFoundException('Reserva não encontrada.');
    }

    const hoje = this.inicioDoDia(new Date());
    const dataEntrada = this.inicioDoDia(reserva.dataEntrada);
    const limite = new Date(dataEntrada);
    limite.setDate(limite.getDate() + 1);

    if (hoje > limite) {
      throw new BadRequestException(
        'No-show não permitido após a data limite (entrada + 1 dia).',
      );
    }

    const updated = await this.prisma.reservaHospede.update({
      where: { id: hospedeId },
      data: {
        situacao: StatusHospede.NOSHOW,
        noShowEm: new Date(),
      },
      include: this.guestInclude(),
    });

    this.logger.log(
      `[AUDITORIA] Ação: NOSHOW_REGISTRADO | Operador: [${operador}] | Status: SUCESSO | Reserva: [${updated.reserva.numeroReserva}] | Hóspede: [${updated.hospede.nome}]`,
    );

    await this.avaliarSituacaoReserva(updated.reservaId);
    return updated;
  }

  // ----------------------------------------------------------
  // Consultas (BFF) adaptadas para os relacionamentos 
  // ----------------------------------------------------------

  async getHospedeStatus(hospedeId: string) {
    const guest = await this.prisma.reservaHospede.findUnique({
      where: { id: hospedeId },
      select: {
        id: true,
        situacao: true,
        preCheckinEm: true,
        checkinEm: true,
        checkoutEm: true,
        noShowEm: true,
        responsavel: true,
        hospede: {
          select: { nome: true, numeroDocumento: true },
        },
      },
    });

    if (!guest) {
      throw new NotFoundException('Hóspede não encontrado na reserva.');
    }
    return guest;
  }

  async searchGuests(query: string) {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const term = query.trim();

    const guests = await this.prisma.reservaHospede.findMany({
      where: {
        hospede: {
          nome: {
            contains: term,
            mode: 'insensitive',
          },
        },
        situacao: {
          in: [
            StatusHospede.PRECHECKIN_NAOVINCULADO,
            StatusHospede.PRECHECKIN_PENDENTE,
            StatusHospede.PRECHECKIN_REALIZADO,
            StatusHospede.CHECKIN_REALIZADO,
          ],
        },
        // TRAVA: Ocultar hóspedes caso a reserva pai esteja cancelada
        reserva: {
          situacao: {
            not: StatusReserva.CANCELADA
          }
        }
      },
      select: {
        id: true,
        hospede: { select: { nome: true } },
        reserva: {
          select: { id: true, numeroReserva: true },
        },
      },
      take: 10,
    });

    return guests.map((g) => ({
      nome: g.hospede.nome,
      numeroReserva: g.reserva.numeroReserva,
      reserva_id: g.reserva.id,
    }));
  }

  async getAtrasos() {
    const hoje = this.inicioDoDia(new Date());

    const reservasVencidas = await this.prisma.reserva.findMany({
      where: {
        situacao: StatusReserva.EM_ANDAMENTO, // EM_ANDAMENTO já exclui nativamente CANCELADA e CONCLUIDA
        dataSaida: { lt: hoje },
      },
      select: {
        id: true,
        numeroReserva: true,
        dataSaida: true,
        quarto: { select: { numero: true } },
        statusPagamento: true,
        valorTotal: true,
        hospedes: {
          include: {
            hospede: { select: { nome: true } },
          },
        },
      },
    });

    return reservasVencidas
      .map((reserva) => {
        const pendentes = reserva.hospedes.filter(
          (h) => h.situacao === StatusHospede.CHECKIN_REALIZADO,
        );
        if (pendentes.length === 0) return null;

        const hospedeResponsavel = reserva.hospedes.find((h) => h.responsavel);
        const diasAtraso = Math.floor(
          (hoje.getTime() - new Date(reserva.dataSaida).getTime()) /
            (1000 * 60 * 60 * 24),
        );

        return {
          reserva_id: reserva.id,
          numero_reserva: reserva.numeroReserva,
          quarto: reserva.quarto?.numero ?? 'N/D', 
          hospede_responsavel: hospedeResponsavel?.hospede?.nome ?? 'N/D',
          data_saida: reserva.dataSaida.toISOString().slice(0, 10),
          diasAtraso,
          status_pagamento: reserva.statusPagamento,
          valor_total: reserva.valorTotal ? Number(reserva.valorTotal) : 0, 
          pendentesCheckout: pendentes.length,
          totalHospedes: reserva.hospedes.length,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.diasAtraso - a.diasAtraso);
  }

  // ----------------------------------------------------------
  // Métodos auxiliares privados alinhados ao Modelo Prisma
  // ----------------------------------------------------------

  private async findReservationGuestOrFail(id: string) {
    const guest = await this.prisma.reservaHospede.findUnique({ 
      where: { id },
      // TRAVA DE SEGURANÇA: Traz o status da reserva para checagem
      include: { reserva: { select: { situacao: true } } }
    });
    
    if (!guest) throw new NotFoundException('Hóspede não encontrado na reserva.');
    
    if (guest.reserva.situacao === StatusReserva.CANCELADA) {
      throw new BadRequestException('Esta reserva foi cancelada. Não é possível realizar operações nela.');
    }
    
    return guest;
  }

  private guestInclude() {
    return {
      reserva: true,
      hospede: { select: { nome: true, numeroDocumento: true } },
    };
  }

  private inicioDoDia(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // CORREÇÃO FNRH: Regras estritas de transição de status da Reserva
  private async avaliarSituacaoReserva(reservaId: string) {
    const reservation = await this.prisma.reserva.findUnique({
      where: { id: reservaId },
      include: { hospedes: true },
    });
    if (!reservation || reservation.hospedes.length === 0) return;
    
    // Ignora avaliação se a reserva já estiver cancelada
    if (reservation.situacao === StatusReserva.CANCELADA) return;

    const todos = reservation.hospedes;
    
    // A Reserva só está Concluída ou No-show se TODOS os hóspedes finalizaram seu ciclo
    const todosFinalizados = todos.every(
      (h) =>
        h.situacao === StatusHospede.CHECKOUT_REALIZADO ||
        h.situacao === StatusHospede.NOSHOW ||
        h.situacao === StatusHospede.CANCELADO,
    );

    if (todosFinalizados) {
      // Se teve pelo menos UM checkout, a reserva foi concluída com sucesso.
      const algumCheckout = todos.some((h) => h.situacao === StatusHospede.CHECKOUT_REALIZADO);
      
      const novoStatus = algumCheckout ? StatusReserva.CONCLUIDA : StatusReserva.NOSHOW;

      if (reservation.situacao !== novoStatus) {
        await this.prisma.reserva.update({
          where: { id: reservaId },
          data: { situacao: novoStatus },
        });
      }
      return;
    }

    // Se a reserva estava criada, mas alguém fez checkin, ela muda para Em Andamento
    if (reservation.situacao === StatusReserva.CRIADA) {
      const alguemCheckin = todos.some((h) => h.situacao === StatusHospede.CHECKIN_REALIZADO);
      
      if (alguemCheckin) {
        await this.prisma.reserva.update({
          where: { id: reservaId },
          data: { situacao: StatusReserva.EM_ANDAMENTO },
        });
      }
    }
  }
}