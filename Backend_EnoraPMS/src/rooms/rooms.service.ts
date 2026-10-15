import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  private parseDateUtc(date: string): Date {
    const parsedDate = dayjs.utc(date);
    const apenasData = date.split('T')[0];

    if (!parsedDate.isValid()) {
      throw new BadRequestException('Data fornecida é inválida.');
    }
    return new Date(`${apenasData}T00:00:00.000Z`);
  }

  async getQuartosSimples() {
    return this.prisma.quarto.findMany({
      select: {
        id: true,
        numero: true,
        bloco: true,
        andar: true,
        tipo: true,
      },
      orderBy: [
        { bloco: 'asc' },
        { andar: 'asc' },
        { numero: 'asc' },
      ],
    });
  }

  async getRoomsByDate(date: string) {
    return this.getReservationMap(date, 1);
  }

  // O motor analítico: Single Source of Truth com metadados detalhados
  async getReservationMap(start: string, days: number = 7) {
    const startDate = this.parseDateUtc(start);
    const endDate = dayjs.utc(startDate).add(days - 1, 'day').toDate();

    const rawResults = await this.prisma.$queryRaw<
      Array<{
        id: number;
        numero: string;
        bloco: string;
        andar: number;
        tipo: string;
        dia: Date;
        situacao: string;
        detalhes_json: string | null;
      }>
    >`
      WITH Dias AS (
        SELECT generate_series(
          ${startDate}::date,
          ${endDate}::date,
          '1 day'::interval
        )::date AS dia
      ),
      Base AS (
        SELECT
          q.id,
          q.numero,
          q.bloco,
          q.andar,
          q.tipo,
          d.dia,
          (
            CASE
              -- 1. OCUPADO (Prioridade 1)
              WHEN EXISTS (
                SELECT 1 FROM "Reserva" r 
                WHERE r."quartoId" = q.id 
                AND r.situacao = 'EM_ANDAMENTO' 
                AND d.dia >= (r."dataEntrada" AT TIME ZONE 'UTC')::date 
                AND d.dia < (r."dataSaida" AT TIME ZONE 'UTC')::date
              ) THEN 'OCUPADO'
              
              -- 2. RESERVADO (Prioridade 2)
              WHEN EXISTS (
                SELECT 1 FROM "Reserva" r 
                WHERE r."quartoId" = q.id 
                AND r.situacao = 'CRIADA' 
                AND d.dia >= (r."dataEntrada" AT TIME ZONE 'UTC')::date 
                AND d.dia < (r."dataSaida" AT TIME ZONE 'UTC')::date
              ) THEN 'RESERVADO'
              
              -- 3. MANUTENÇÃO (Prioridade 3)
              WHEN EXISTS (
                SELECT 1 FROM "Manutencao" m 
                WHERE m."quartoId" = q.id 
                AND m.status IN ('EM_ABERTO', 'EM_ANDAMENTO') 
                AND (m."criadoEm" AT TIME ZONE 'UTC')::date <= d.dia
              ) THEN 'MANUTENCAO'
              
              -- 4. LIMPEZA (Prioridade 4)
              WHEN EXISTS (
                SELECT 1 FROM "Governanca" g 
                WHERE g."quartoId" = q.id 
                AND g.status IN ('PENDENTE', 'EM_ANDAMENTO') 
                AND g."dataPrevista" <= d.dia
              ) THEN 'LIMPEZA'
              
              ELSE 'LIVRE'
            END
          ) as situacao,
          
          -- CONSTRUÇÃO DO JSON COM OS CAMPOS EXATOS DO SCHEMA
          (
            CASE
              -- Detalhes para quarto OCUPADO
              WHEN EXISTS (
                SELECT 1 FROM "Reserva" r 
                WHERE r."quartoId" = q.id AND r.situacao = 'EM_ANDAMENTO' 
                AND d.dia >= (r."dataEntrada" AT TIME ZONE 'UTC')::date AND d.dia < (r."dataSaida" AT TIME ZONE 'UTC')::date
              ) THEN (
                SELECT json_build_object(
                  'hospede', h.nome,
                  'entrada', to_char(r."dataEntrada", 'DD/MM'),
                  'saida', to_char(r."dataSaida", 'DD/MM'),
                  'infoAdicional', 'Reserva: ' || r."numeroReserva" || COALESCE(' | Motivo: ' || rh."motivoViagem"::text, '')
                )::text
                FROM "Reserva" r
                INNER JOIN "Hospede" h ON h.id = r."hospedeResponsavelId"
                LEFT JOIN "ReservaHospede" rh ON rh."reservaId" = r.id AND rh.responsavel = true
                WHERE r."quartoId" = q.id AND r.situacao = 'EM_ANDAMENTO'
                AND d.dia >= (r."dataEntrada" AT TIME ZONE 'UTC')::date AND d.dia < (r."dataSaida" AT TIME ZONE 'UTC')::date
                LIMIT 1
              )
              
              -- Detalhes para quarto RESERVADO
              WHEN EXISTS (
                SELECT 1 FROM "Reserva" r 
                WHERE r."quartoId" = q.id AND r.situacao = 'CRIADA' 
                AND d.dia >= (r."dataEntrada" AT TIME ZONE 'UTC')::date AND d.dia < (r."dataSaida" AT TIME ZONE 'UTC')::date
              ) THEN (
                SELECT json_build_object(
                  'hospede', h.nome,
                  'entrada', to_char(r."dataEntrada", 'DD/MM'),
                  'saida', to_char(r."dataSaida", 'DD/MM'),
                  'infoAdicional', 'Reserva Garantida: ' || r."numeroReserva"
                )::text
                FROM "Reserva" r
                INNER JOIN "Hospede" h ON h.id = r."hospedeResponsavelId"
                WHERE r."quartoId" = q.id AND r.situacao = 'CRIADA'
                AND d.dia >= (r."dataEntrada" AT TIME ZONE 'UTC')::date AND d.dia < (r."dataSaida" AT TIME ZONE 'UTC')::date
                LIMIT 1
              )

              -- Detalhes para MANUTENÇÃO
              WHEN EXISTS (
                SELECT 1 FROM "Manutencao" m 
                WHERE m."quartoId" = q.id AND m.status IN ('EM_ABERTO', 'EM_ANDAMENTO') AND (m."criadoEm" AT TIME ZONE 'UTC')::date <= d.dia
              ) THEN (
                SELECT json_build_object(
                  'hospede', 'Bloqueio de Manutenção',
                  'entrada', to_char(m."criadoEm", 'DD/MM'),
                  'saida', '--/--',
                  'infoAdicional', 'Tipo: ' || m.tipo || ' | Descrição: ' || m.descricao
                )::text
                FROM "Manutencao" m
                WHERE m."quartoId" = q.id AND m.status IN ('EM_ABERTO', 'EM_ANDAMENTO') AND (m."criadoEm" AT TIME ZONE 'UTC')::date <= d.dia
                LIMIT 1
              )

              -- Detalhes para LIMPEZA / GOVERNANÇA
              WHEN EXISTS (
                SELECT 1 FROM "Governanca" g 
                WHERE g."quartoId" = q.id AND g.status IN ('PENDENTE', 'EM_ANDAMENTO') AND g."dataPrevista" <= d.dia
              ) THEN (
                SELECT json_build_object(
                  'hospede', 'Equipe de Governança',
                  'entrada', to_char(g."dataPrevista", 'DD/MM'),
                  'saida', '--/--',
                  'infoAdicional', 'Serviço: ' || g.tipo || COALESCE(' - ' || g.descricao, '')
                )::text
                FROM "Governanca" g
                WHERE g."quartoId" = q.id AND g.status IN ('PENDENTE', 'EM_ANDAMENTO') AND g."dataPrevista" <= d.dia
                LIMIT 1
              )
              
              ELSE NULL
            END
          ) as detalhes_json
        FROM "Quarto" q
        CROSS JOIN Dias d
      )
      SELECT id, numero, bloco, andar, tipo, dia, situacao, detalhes_json
      FROM Base
      ORDER BY bloco ASC, andar ASC, numero ASC, dia ASC;
    `;

    if (!rawResults || rawResults.length === 0) return [];

    const mapa = new Map<
      string,
      {
        id: number;
        room: string;
        block: string;
        floor: number;
        type: string;
        availability: Record<string, any>;
      }
    >();

    for (const row of rawResults) {
      const isoDate = dayjs.utc(row.dia).format('YYYY-MM-DD');

      if (!mapa.has(row.numero)) {
        mapa.set(row.numero, {
          id: row.id,
          room: row.numero,
          block: row.bloco,
          floor: row.andar,
          type: row.tipo,
          availability: {},
        });
      }

      const detalhes = row.detalhes_json
        ? JSON.parse(row.detalhes_json)
        : null;

      mapa.get(row.numero)!.availability[isoDate] = {
        situacao: row.situacao,
        detalhes,
      };
    }

    return Array.from(mapa.values());
  }

  async getRoomDetailsByDate(roomNumber: string, dateStr: string) {
    const targetDate = this.parseDateUtc(dateStr);

    // 1. Verificar OCUPADO ou RESERVADO
    const reserva = await this.prisma.reserva.findFirst({
      where: {
        quarto: { numero: roomNumber },
        situacao: { in: ['EM_ANDAMENTO', 'CRIADA'] },
        dataEntrada: { lte: targetDate },
        dataSaida: { gt: targetDate },
      },
      include: {
        hospedeResponsavel: true,
        hospedes: {
          where: { responsavel: true },
          select: { motivoViagem: true }
        }
      },
    });

    if (reserva) {
      const motivo = reserva.hospedes[0]?.motivoViagem ? `Motivo: ${reserva.hospedes[0].motivoViagem}` : `Reserva código: ${reserva.numeroReserva}`;
      return {
        situacao: reserva.situacao === 'EM_ANDAMENTO' ? 'OCUPADO' : 'RESERVADO',
        hospede: reserva.hospedeResponsavel.nome,
        entrada: dayjs.utc(reserva.dataEntrada).format('DD/MM/YYYY'),
        saida: dayjs.utc(reserva.dataSaida).format('DD/MM/YYYY'),
        infoAdicional: motivo,
      };
    }
    
    const fimDoDia = dayjs
      .utc(targetDate)
      .endOf('day')
      .toDate();

    const manutencao = await this.prisma.manutencao.findFirst({
      where: {
        quarto: { numero: roomNumber },
        status: { in: ['EM_ABERTO', 'EM_ANDAMENTO'] },
        criadoEm: { lte: fimDoDia },
      },
    });

    if (manutencao) {
      return {
        situacao: 'MANUTENCAO',
        hospede: 'Setor de Manutenção / Infraestrutura',
        entrada: dayjs.utc(manutencao.criadoEm).format('DD/MM/YYYY'),
        saida: 'Previsão não informada',
        infoAdicional: `[${manutencao.tipo}] ${manutencao.descricao} - Prioridade: ${manutencao.prioridade}`,
      };
    }

    // 3. Verificar GOVERNANÇA (LIMPEZA)
    const governanca = await this.prisma.governanca.findFirst({
      where: {
        quarto: { numero: roomNumber },
        status: { in: ['PENDENTE', 'EM_ANDAMENTO'] },
        dataPrevista: { lte: targetDate },
      },
    });

    if (governanca) {
      return {
        situacao: 'LIMPEZA',
        hospede: 'Setor de Governança / Camareiras',
        entrada: dayjs.utc(governanca.dataPrevista).format('DD/MM/YYYY'),
        saida: 'Término pendente',
        infoAdicional: `[${governanca.tipo}] ${governanca.descricao || 'Higienização e conferência do quarto.'}`,
      };
    }

    // 4. Se não achou nada, está LIVRE
    return {
      situacao: 'LIVRE',
      hospede: null,
      entrada: null,
      saida: null,
      infoAdicional: null,
    };
  }
}