import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import { StatusHospede, TipoDocumento } from '@prisma/client'; // CORREÇÃO FNRH: Importação dos Enums Oficiais
import {
  BuscarHospedeDto,
  CriarReservaDto,
  AtualizarReservaDto,
  VincularHospedeDto,
  AtualizarStatusHospedeDto,
} from './reservation.security.dto';

// ---------- Classes Utilitárias ----------
export class PatchedUpdateReservaDto extends AtualizarReservaDto {}
export class StarsStatusHospedeDto extends AtualizarStatusHospedeDto {}

// ---------- Mapeadores (Isolados do Frontend) ----------
const situacaoLabel = (s: string) =>
  ({
    CRIADA: 'Criada',
    EM_ANDAMENTO: 'Em Andamento',
    CONCLUIDA: 'Concluída',
    CANCELADA: 'Cancelada',
    NOSHOW: 'No-Show',
  })[s] ?? s;

// CORREÇÃO FNRH: Alinhado com o Domínio de Situações do Hóspede v2
const situacaoHospedeLabel = (s: string) =>
  ({
    PRECHECKIN_NAOVINCULADO: 'Pré-check-in não vinculado',
    PRECHECKIN_PENDENTE: 'Pré-check-in pendente',
    PRECHECKIN_REALIZADO: 'Pré-check-in realizado',
    CHECKIN_REALIZADO: 'Check-in realizado',
    CHECKOUT_REALIZADO: 'Check-out realizado',
    NOSHOW: 'No-show',
    CANCELADO: 'Cancelado',
  })[s] ?? s;

const snakeReservation = (r: any) => ({
  reserva_id: r.id,
  numero_reserva: r.numeroReserva,
  numero_reserva_ota: r.numeroReservaOta,
  data_entrada: r.dataEntrada.toISOString().split('T')[0],
  data_saida: r.dataSaida.toISOString().split('T')[0],
  origem_reserva_id: r.origemReservaId,
  origem_reserva_label: 'Meio de Hospedagem',
  situacao_reserva_id: r.situacao,
  situacao_reserva_label: situacaoLabel(r.situacao),
  link_precheckin: r.linkPreCheckin,
  quarto: r.quarto?.numero ?? r.quartoId,
  hospede_responsavel: r.hospedeResponsavel?.nome,
  quantidade_hospede_adulto: r.quantidadeHospedeAdulto ?? 1, 
  quantidade_hospede_menor: r.quantidadeHospedeMenor ?? 0,   
  valor_total: r.valorTotal,
  forma_pagamento: r.formaPagamento,
  status_pagamento: r.statusPagamento,
  pago_em: r.pagoEm ? r.pagoEm.toISOString().slice(0, 10) : null,
  criado_por: r.criador?.nome || 'Sistema',
  atualizado_por: r.atualizador?.nome || null,
  createdAt: r.criadoEm,
  updatedAt: r.atualizadoEm,
  canceledAt: r.canceladoEm,
  hospedes: r.hospedes ? r.hospedes.map((h: any) => ({
      hospede: {
        hospede_id: h.id, 
        responsavel_quarto: h.responsavel,
        situacao_hospede_id: h.situacao,
        situacao_hospede: situacaoHospedeLabel(h.situacao),
        // CORREÇÃO FNRH: Estes campos pertencem à Ficha (ReservaHospede) e não mais à Reserva
        meio_transporte: h.meioTransporte,
        motivo_viagem: h.motivoViagem,
      },
      pessoa: {
        id: h.hospede?.id,
        nome: h.hospede?.nome,
        tipo_documento_id: h.hospede?.tipoDocumento,
        numero: h.hospede?.numeroDocumento
      }
    })) : [],
});

const snakeHospede = (g: any) => ({
  id: g.id,
  nome: g.nome,
  tipo_documento: g.tipoDocumento,
  numero_documento: g.numeroDocumento,
  email: g.email,
  telefone: g.telefone,
});

// CORREÇÃO FNRH: Array atualizado com a máquina de estados oficial da FNRH v2
const STATUS_VALIDOS_GUEST = [
  'PRECHECKIN_NAOVINCULADO',
  'PRECHECKIN_PENDENTE',
  'PRECHECKIN_REALIZADO',
  'CHECKIN_REALIZADO',
  'CHECKOUT_REALIZADO',
  'NOSHOW',
  'CANCELADO'
];

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =================== UTILITÁRIOS INTERNOS ===================
  private parseDateUtc(dateStr: string): Date {
    const d = new Date(`${dateStr.split('T')[0]}T00:00:00.000Z`);
    if (isNaN(d.getTime()) || d.getFullYear() < 2000 || d.getFullYear() > 2100) {
      throw new BadRequestException(`A data informada é inválida: ${dateStr}`);
    }
    return d;
  }

  private async getOperadorNome(operadorId: number): Promise<string> {
    const op = await this.prisma.usuario.findUnique({ where: { id: operadorId }, select: { nome: true } });
    return op ? op.nome : 'Sistema';
  }

  // =================== HÓSPEDES ===================
  async buscarHospede(dto: BuscarHospedeDto) {
    const docLimpo = dto.numero_documento.replace(/\D/g, '');
    const guest = await this.prisma.hospede.findUnique({
      where: { numeroDocumento: docLimpo },
    });
    if (!guest) throw new NotFoundException('Nenhum hóspede localizado.');
    return snakeHospede(guest);
  }

  // =================== QUARTOS DISPONÍVEIS ===================
  async availableRooms(dataEntrada: string, dataSaida: string, excludeId?: string) {
    const entrada = this.parseDateUtc(dataEntrada);
    const saida = this.parseDateUtc(dataSaida);

    if (saida <= entrada) throw new BadRequestException('Saída deve ser posterior à entrada.');

    const todosQuartos = await this.prisma.quarto.findMany({
      select: { numero: true },
      orderBy: { numero: 'asc' },
    });

    const ocupados = await this.prisma.reserva.findMany({
      where: {
        situacao: { in: ['CRIADA', 'EM_ANDAMENTO'] },
        dataEntrada: { lt: saida },
        dataSaida: { gt: entrada },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { quarto: { select: { numero: true } } }, 
    });
    
    const quartosOcupados = new Set(ocupados.map(o => o.quarto?.numero).filter(Boolean));

    return todosQuartos
      .filter(q => !quartosOcupados.has(q.numero))
      .map(q => ({ numero: q.numero }));
  }

  // =================== RESERVAS (CRUD) ===================
  async findAll(page: number, limit: number, situacao?: string, dataEntrada?: string, dataSaida?: string, search?: string) {
    const take = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const skip = (Math.max(Number(page), 1) - 1) * take;

    const where: any = {};
    if (situacao) where.situacao = situacao;
    if (dataEntrada) where.dataEntrada = { gte: this.parseDateUtc(dataEntrada) };
    if (dataSaida) where.dataSaida = { lte: this.parseDateUtc(dataSaida) };
    
    if (search) {
      where.OR = [
        { numeroReserva: { contains: search, mode: 'insensitive' } },
        { quarto: { numero: { contains: search, mode: 'insensitive' } } }, 
        { hospedeResponsavel: { nome: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [reservations, total] = await Promise.all([
      this.prisma.reserva.findMany({
        where,
        include: { hospedeResponsavel: true, hospedes: { include: { hospede: true } }, quarto: true, criador: true, atualizador: true },
        orderBy: { criadoEm: 'desc' },
        skip,
        take,
      }),
      this.prisma.reserva.count({ where }),
    ]);

    return {
      data: reservations.map(snakeReservation),
      meta: {
        total,
        page: Number(page),
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async findOne(id: string) {
    const res = await this.prisma.reserva.findUnique({
      where: { id },
      include: {
        hospedeResponsavel: true,
        hospedes: { include: { hospede: true } },
        quarto: true,
        criador: true,
        atualizador: true,
      },
    });
    if (!res) throw new NotFoundException('Reserva não encontrada.');
    return snakeReservation(res);
  }

  async create(dto: CriarReservaDto, operadorId: number) {
    const entrada = this.parseDateUtc(dto.data_entrada);
    const saída = this.parseDateUtc(dto.data_saida);

    if (saída <= entrada) throw new BadRequestException('A data de saída deve ser posterior à entrada.');

    const conflito = await this.prisma.reserva.findFirst({
      where: {
        quarto: { numero: dto.quarto }, 
        situacao: { in: ['CRIADA', 'EM_ANDAMENTO'] },
        dataEntrada: { lt: saída },
        dataSaida: { gt: entrada },
      },
    });
    
    if (conflito) {
      throw new ConflictException(
        `O quarto ${dto.quarto} já possui reserva ativa de ${conflito.dataEntrada.toISOString().slice(0, 10)} a ${conflito.dataSaida.toISOString().slice(0, 10)}`
      );
    }

    let targetGuestId = dto.hospede_id;

    if (!targetGuestId && dto.numero_documento) {
      const docLimpo = dto.numero_documento.replace(/\D/g, '');
      let guest = await this.prisma.hospede.findUnique({ where: { numeroDocumento: docLimpo } });
      
      if (!guest) {
        if (!dto.hospede_nome) throw new BadRequestException('Nome do hóspede é obrigatório para novo cadastro.');
        
        guest = await this.prisma.hospede.create({
          data: {
            nome: dto.hospede_nome,
            // CORREÇÃO FNRH: Tipagem de Documento cravada com o Enum Oficial
            tipoDocumento: (dto.tipo_documento === 'PASSAPORTE' ? TipoDocumento.PASSAPORTE : TipoDocumento.CPF),
            numeroDocumento: docLimpo,
            genero: 'NAOINFORMADO', 
            dataNascimento: new Date('1900-01-01T00:00:00.000Z'), 
            criador: { connect: { id: operadorId } },
          },
        });
      }
      targetGuestId = guest.id;
    }

    if (!targetGuestId) throw new BadRequestException('Forneça o ID ou o número de documento do hóspede.');

    const year = new Date().getFullYear();
    const ultimaReserva = await this.prisma.reserva.findFirst({
      where: { numeroReserva: { startsWith: `RES-${year}-` } },
      orderBy: { numeroReserva: 'desc' },
    });
    
    let seq = 1;
    if (ultimaReserva) {
      const match = ultimaReserva.numeroReserva.match(/RES-\d{4}-(\d{4})/);
      if (match) seq = parseInt(match[1], 10) + 1;
    }
    
    const numeroReservaBase = `RES-${year}-${String(seq).padStart(4, '0')}`;

    // --- AUDITORIA FINANCEIRA ---
    let valorEfetivo = dto.valor_total ? Number(dto.valor_total) : null;
    let ehPago = !!(valorEfetivo && dto.forma_pagamento && dto.forma_pagamento !== 'convenio');
    let statusPgDefinitivo = (dto.status_pagamento === 'pago' || ehPago) ? 'pago' : 'pendente';
    let dataPgDefinitivo = statusPgDefinitivo === 'pago' ? (dto.pago_em ? new Date(dto.pago_em) : new Date()) : null;
    let hospedesExtraConvenio: string[] = [];
    let empresaIdVinculada: number | null = null; 

    if (dto.forma_pagamento === 'convenio') {
      const hospedeBase = await this.prisma.hospede.findUnique({ where: { id: targetGuestId! } });
      
      if (!hospedeBase) {
        throw new BadRequestException('Hóspede não encontrado para validação do convênio.');
      }

      let empresa = await this.prisma.empresa.findFirst({
        where: { contatoFinanceiroNumDoc: hospedeBase.numeroDocumento }
      });

      if (!empresa) {
        const vinculoFuncionario = await this.prisma.funcionario.findFirst({
          where: { hospedeId: hospedeBase.id, hospedadoAtualmente: true },
          include: { empresa: true }
        });

        if (vinculoFuncionario) {
          empresa = vinculoFuncionario.empresa;
        }
      }

      if (empresa) {
        empresaIdVinculada = empresa.id; 

        const funcionariosAtivos = await this.prisma.funcionario.findMany({
          where: { empresaId: empresa.id, hospedadoAtualmente: true }
        });

        hospedesExtraConvenio = funcionariosAtivos.map(f => f.hospedeId);

        const isResponsavel = empresa.contatoFinanceiroNumDoc === hospedeBase.numeroDocumento;
        const qtdTotalHospedes = isResponsavel ? (1 + funcionariosAtivos.length) : funcionariosAtivos.length;
        
        const valorBase = Number(empresa.valorBaseDiaria || 80);
        const desconto = Number(empresa.desconto || 0);
        
        valorEfetivo = (qtdTotalHospedes * valorBase) * (1 - desconto);
        statusPgDefinitivo = 'pago';
        dataPgDefinitivo = new Date();
      } else {
        throw new BadRequestException('Este hóspede não possui nenhum convênio corporativo ativo.');
      }
    }

    try {
      const reservation = await this.prisma.$transaction(async (tx) => {
        const reserva = await tx.reserva.create({
          data: {
            numeroReserva: numeroReservaBase,
            dataEntrada: entrada,
            dataSaida: saída,
            origemReservaId: dto.origem_reserva_id || 'MEIOHOSPEDAGEM',
            quarto: { connect: { numero: dto.quarto } }, 
            hospedeResponsavel: { connect: { id: targetGuestId! } },
            ...(empresaIdVinculada ? { empresa: { connect: { id: empresaIdVinculada } } } : {}),
            quantidadeHospedeAdulto: dto.quantidade_hospede_adulto !== undefined ? Number(dto.quantidade_hospede_adulto) : 1, 
            quantidadeHospedeMenor: dto.quantidade_hospede_menor !== undefined ? Number(dto.quantidade_hospede_menor) : 0,   
            valorTotal: valorEfetivo,
            formaPagamento: dto.forma_pagamento,
            statusPagamento: statusPgDefinitivo, 
            pagoEm: dataPgDefinitivo, 
            linkPreCheckin: randomUUID(),
            criador: { connect: { id: operadorId } },
          },
          include: { hospedeResponsavel: true, quarto: true },
        });

        // 1. Vincula o Titular da Reserva
        await tx.reservaHospede.create({
          data: {
            reservaId: reserva.id,
            hospedeId: targetGuestId!,
            situacao: StatusHospede.PRECHECKIN_PENDENTE, // CORREÇÃO FNRH: Uso do novo Enum
            responsavel: true,
            // CORREÇÃO FNRH: Informações transferidas para a ficha individual do hóspede
            meioTransporte: dto.meio_transporte as any,
            motivoViagem: dto.motivo_viagem as any,
          },
        });

        // 2. Vincula automaticamente todos os funcionários ativos da empresa (Evitando duplicar o titular)
        for (const extraId of hospedesExtraConvenio) {
          if (extraId !== targetGuestId) { 
            await tx.reservaHospede.create({
              data: {
                reservaId: reserva.id,
                hospedeId: extraId,
                situacao: StatusHospede.PRECHECKIN_PENDENTE, // CORREÇÃO FNRH: Uso do novo Enum
                responsavel: false,
              },
            });
          }
        }

        return reserva;
      });

      const nomeOperador = await this.getOperadorNome(operadorId);
      this.logger.log(`[AUDITORIA] Ação: CRIAÇÃO_RESERVA | Operador: [${nomeOperador}] | Código: [${reservation.numeroReserva}]`);
      
      return snakeReservation(reservation);

    } catch (error: any) {
      if (error.code === 'P2002' && error.meta?.target?.includes('numeroReserva')) {
         const fallbackNumero = `${numeroReservaBase}-${randomUUID().split('-')[0]}`;
         throw new ConflictException(`Colisão de reserva. Tente salvar novamente. Sugestão: ${fallbackNumero}`);
      }
      throw error;
    }
  }

  async update(id: string, dto: PatchedUpdateReservaDto, operadorId: number) {
    const reserva = await this.prisma.reserva.findUnique({ where: { id } });
    if (!reserva) throw new NotFoundException('Reserva não encontrada.');
    if (reserva.situacao !== 'CRIADA') {
      throw new BadRequestException('Apenas reservas com status CRIADA podem ser editadas.');
    }

    const dados: any = { atualizador: { connect: { id: operadorId } } };
    
    if (dto.hospede_id) { dados.hospedeResponsavel = { connect: { id: dto.hospede_id } };}
    if (dto.data_entrada) dados.dataEntrada = this.parseDateUtc(dto.data_entrada);
    if (dto.data_saida) dados.dataSaida = this.parseDateUtc(dto.data_saida);
    if (dto.quarto) dados.quarto = { connect: { numero: dto.quarto } }; 
    if (dto.origem_reserva_id) dados.origemReservaId = dto.origem_reserva_id;
    if (dto.quantidade_hospede_adulto !== undefined) dados.quantidadeHospedeAdulto = Number(dto.quantidade_hospede_adulto); 
    if (dto.quantidade_hospede_menor !== undefined) dados.quantidadeHospedeMenor = Number(dto.quantidade_hospede_menor);   

    // --- AUDITORIA FINANCEIRA (AVALIAÇÃO DE ESTADO HÍBRIDO) ---
    const valorAtual = dto.valor_total !== undefined ? (dto.valor_total ? Number(dto.valor_total) : null) : reserva.valorTotal;
    const formaAtual = dto.forma_pagamento !== undefined ? dto.forma_pagamento : reserva.formaPagamento;
    
    const ehPago = !!(valorAtual && formaAtual && formaAtual !== 'convenio');
    const statusPgDefinitivo = (dto.status_pagamento === 'pago' || ehPago) ? 'pago' : 'pendente';

    dados.valorTotal = valorAtual;
    dados.formaPagamento = formaAtual;
    dados.statusPagamento = statusPgDefinitivo;

    // Atualiza a data do pagamento apenas se estiver transitando de pendente para pago
    if (statusPgDefinitivo === 'pago' && reserva.statusPagamento !== 'pago') {
      dados.pagoEm = dto.pago_em ? new Date(dto.pago_em) : new Date();
    } else if (statusPgDefinitivo === 'pendente') {
      dados.pagoEm = null; // Reverte os dados financeiros se a operação for apagada
    }

    const entrada = dados.dataEntrada || reserva.dataEntrada;
    const saída = dados.dataSaida || reserva.dataSaida;

    if (dados.dataEntrada || dados.dataSaida || dto.quarto) {
      const quartoBusca = dto.quarto ? { numero: dto.quarto } : (reserva.quartoId ? { id: reserva.quartoId } : null);
      
      if (quartoBusca) {
        const conflito = await this.prisma.reserva.findFirst({
          where: {
            id: { not: id },
            quarto: quartoBusca,
            situacao: { in: ['CRIADA', 'EM_ANDAMENTO'] },
            dataEntrada: { lt: saída },
            dataSaida: { gt: entrada },
          },
        });
        if (conflito) throw new ConflictException(`O quarto já está reservado neste período.`);
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // CORREÇÃO FNRH: Se os dados de viagem vierem na edição, atualiza a ficha do responsável
      if (dto.meio_transporte || dto.motivo_viagem) {
        const updateFichaData: any = {};
        if (dto.meio_transporte) updateFichaData.meioTransporte = dto.meio_transporte;
        if (dto.motivo_viagem) updateFichaData.motivoViagem = dto.motivo_viagem;

        await tx.reservaHospede.updateMany({
          where: { reservaId: id, responsavel: true },
          data: updateFichaData,
        });
      }

      return tx.reserva.update({
        where: { id },
        data: dados,
        include: { hospedeResponsavel: true, quarto: true, criador: true, atualizador: true },
      });
    });

    const nomeOperador = await this.getOperadorNome(operadorId);
    this.logger.log(`[AUDITORIA] Ação: ATUALIZAÇÃO_RESERVA | Operador: [${nomeOperador}] | Código: [${updated.numeroReserva}]`);
    
    return snakeReservation(updated);
  }

  async cancel(id: string, operadorId: number) {
    const reserva = await this.prisma.reserva.findUnique({ where: { id } });
    if (!reserva) throw new NotFoundException('Reserva não encontrada.');
    if (!['CRIADA', 'EM_ANDAMENTO'].includes(reserva.situacao)) {
      throw new BadRequestException('Reserva não pode ser cancelada neste status.');
    }

    const updated = await this.prisma.reserva.update({
      where: { id },
      data: { 
        situacao: 'CANCELADA', 
        canceladoEm: new Date(),
        canceladoPorId: operadorId, 
        atualizadoPorId: operadorId 
      },
      include: { 
        hospedeResponsavel: true, 
        quarto: true, 
        criador: true, 
        atualizador: true,
        cancelador: true 
      },
    });

    const nomeOperador = await this.getOperadorNome(operadorId);
    this.logger.warn(`[AUDITORIA] Ação: CANCELAMENTO_RESERVA | Operador: [${nomeOperador}] | Código: [${reserva.numeroReserva}]`);
    
    return snakeReservation(updated);
  }

  async preCheckin(id: string) {
    const reserva = await this.prisma.reserva.findUnique({ where: { id } });
    if (!reserva) throw new NotFoundException('Reserva não encontrada.');

    let link = reserva.linkPreCheckin;
    if (!link) {
      link = randomUUID();
      await this.prisma.reserva.update({ where: { id }, data: { linkPreCheckin: link } });
    }

    await this.prisma.reservaHospede.updateMany({
      where: { reservaId: id, responsavel: true },
      data: { situacao: StatusHospede.PRECHECKIN_REALIZADO, preCheckinEm: new Date() }, // CORREÇÃO FNRH
    });

    return { link_precheckin: link, mensagem: 'Link gerado com sucesso.' };
  }

  // =================== GERENCIAR COMPANHEIROS DE QUARTO ===================
  async addGuest(id: string, dto: VincularHospedeDto) {
    const reserva = await this.prisma.reserva.findUnique({ where: { id } });
    if (!reserva) throw new NotFoundException('Reserva não encontrada.');

    const guest = await this.prisma.hospede.findUnique({ where: { id: dto.hote_guest_id } });
    if (!guest) throw new NotFoundException('Hóspede não encontrado.');

    const existente = await this.prisma.reservaHospede.findFirst({
      where: { reservaId: id, hospedeId: dto.hote_guest_id },
    });
    if (existente) throw new ConflictException('Hóspede já vinculado.');

    await this.prisma.reservaHospede.create({
      data: {
        reservaId: id,
        hospedeId: dto.hote_guest_id,
        situacao: StatusHospede.PRECHECKIN_PENDENTE, // CORREÇÃO FNRH
        responsavel: false,
      },
    });

    return { message: 'Acompanhante adicionado.' };
  }

async removeGuest(id: string, guestId: string) {
    // 1. Busca o vínculo entre a Reserva e o Hóspede
    const vinculo = await this.prisma.reservaHospede.findFirst({
      where: { reservaId: id, hospedeId: guestId },
      include: { reserva: true }
    });

    if (!vinculo) {
      throw new NotFoundException('Vínculo não encontrado.');
    }

    if (vinculo.responsavel) {
      throw new BadRequestException('Não é possível remover o hóspede responsável.');
    }

    // 2. Trava de segurança: Se a reserva tem convênio (empresaId existe)
    if (vinculo.reserva.empresaId) {
      // Verifica se o hóspede que está tentando ser excluído é um funcionário dessa empresa
      const isFuncionarioDoConvenio = await this.prisma.funcionario.findFirst({
        where: { 
          hospedeId: guestId, 
          empresaId: vinculo.reserva.empresaId,
          hospedadoAtualmente: true
        }
      });

      if (isFuncionarioDoConvenio) {
        throw new BadRequestException(
          'Este hóspede faz parte do convênio corporativo. Para removê-lo da reserva, você deve primeiro desativá-lo na página de Convênios.'
        );
      }
    }

    // 3. Se passar por todas as travas, exclui
    await this.prisma.reservaHospede.delete({ where: { id: vinculo.id } });
    
    return { message: 'Acompanhante removido.' };
  }

  async updateGuestStatus(id: string, guestId: string, dto: StarsStatusHospedeDto) {
    if (!STATUS_VALIDOS_GUEST.includes(dto.status)) {
      throw new BadRequestException('Status inválido.');
    }

    const vinculo = await this.prisma.reservaHospede.findFirst({
      where: { reservaId: id, hospedeId: guestId },
    });
    if (!vinculo) throw new NotFoundException('Vínculo não encontrado.');

    const dataByStatus: any = { situacao: dto.status };
    const timestamp = dto.data_hora ? new Date(dto.data_hora) : new Date();

    if (dto.status === 'CHECKIN_REALIZADO') dataByStatus.checkinEm = timestamp;
    else if (dto.status === 'CHECKOUT_REALIZADO') dataByStatus.checkoutEm = timestamp;
    else if (dto.status === 'NOSHOW') dataByStatus.noShowEm = timestamp;

    await this.prisma.reservaHospede.update({
      where: { id: vinculo.id },
      data: dataByStatus,
    });

    return { message: `Status atualizado para ${dto.status}` };
  }
}