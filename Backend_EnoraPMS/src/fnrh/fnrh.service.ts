import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SaveConfigDto } from './fnrh.dto';

// URL base da API Serpro FNRH v2 (homologação)
const SERPRO_BASE_URL =
  'https://hom-lowcode.serpro.gov.br/FNRH_API/rest/v2/pessoas/documento/CPF';

@Injectable()
export class FnrhService {
  constructor(private prisma: PrismaService) {}

  // ----------------------------------------------------------------
  // CONFIGURAÇÕES
  // ----------------------------------------------------------------

  /**
   * Obtém as credenciais salvas (retorna somente o usuário, nunca a chave em texto puro)
   */
  async getConfig() {
    const config = await this.prisma.configuracaoHotel.findFirst();
    if (!config) {
      return { serpro_usuario: null, configurado: false };
    }
    return {
      serpro_usuario: config.serpro_usuario,
      configurado: !!(config.serpro_usuario && config.serpro_chave),
    };
  }

  /**
   * Salva ou atualiza as credenciais Serpro.
   * Usa upsert para garantir que só existe 1 registro de configuração.
   */
  async saveConfig(dto: SaveConfigDto) {
    const existing = await this.prisma.configuracaoHotel.findFirst();

    if (existing) {
      return this.prisma.configuracaoHotel.update({
        where: { id: existing.id },
        data: {
          serpro_usuario: dto.serpro_usuario.trim(),
          serpro_chave: dto.serpro_chave.trim(),
        },
        select: { id: true, serpro_usuario: true, atualizadoEm: true },
      });
    }

    return this.prisma.configuracaoHotel.create({
      data: {
        serpro_usuario: dto.serpro_usuario.trim(),
        serpro_chave: dto.serpro_chave.trim(),
      },
      select: { id: true, serpro_usuario: true, criadoEm: true },
    });
  }

  // ----------------------------------------------------------------
  // BUSCA DE PESSOA POR CPF NA API SERPRO
  // ----------------------------------------------------------------

  /**
   * Consulta o CPF do hóspede na API FNRH v2 do Serpro.
   *
   * Regra de Segurança Crítica:
   *  - Header Authorization: Basic {base64(usuario:chave)} → credenciais do hotel
   *  - Header cpf_solicitante: {cpf do operador logado} → rastreabilidade obrigatória
   *
   * @param cpfHospede CPF do hóspede a ser consultado (somente dígitos)
   * @param cpfOperador CPF do operador que está fazendo a requisição (extraído do JWT)
   */
  async buscarPorCPF(cpfHospede: string, cpfOperador: string) {
    // 1. Valida e sanitiza o CPF recebido
    const cpfLimpo = cpfHospede.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      throw new BadRequestException(
        'CPF inválido. Informe exatamente 11 dígitos.',
      );
    }

    // 2. Carrega as credenciais do banco
    const config = await this.prisma.configuracaoHotel.findFirst();
    if (!config || !config.serpro_usuario || !config.serpro_chave) {
      throw new NotFoundException(
        'Integração FNRH não configurada. Acesse Configurações > Integração FNRH para inserir as credenciais do Serpro.',
      );
    }

    // 3. Monta o header Authorization: Basic em Base64
    const credenciais = Buffer.from(
      `${config.serpro_usuario}:${config.serpro_chave}`,
    ).toString('base64');

    // 4. Realiza a chamada HTTP ao Serpro
    const url = `${SERPRO_BASE_URL}/${cpfLimpo}`;
    let response: Response;

    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${credenciais}`,
          cpf_solicitante: cpfOperador,  // CPF do operador logado — exigência FNRH v2
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });
    } catch (networkError) {
      throw new BadRequestException(
        'Erro de rede ao consultar a API Serpro. Verifique a conectividade.',
      );
    }

    // 5. Trata respostas da API
    if (response.status === 404) {
      throw new NotFoundException(
        'Nenhuma pessoa encontrada com este CPF na base FNRH.',
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new BadRequestException(
        'Credenciais Serpro inválidas ou sem autorização. Verifique as configurações.',
      );
    }

    if (!response.ok) {
      throw new BadRequestException(
        `Erro ao consultar a API Serpro. Status: ${response.status}`,
      );
    }

    // 6. Retorna os dados ao frontend para o auto-fill
    const dados = await response.json();
    return dados;
  }
}
