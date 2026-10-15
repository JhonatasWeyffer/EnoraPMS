import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CriarPessoaDto, AtualizarPessoaDto } from './guests.dto';
import { Prisma, Hospede } from '@prisma/client';

@Injectable()
export class GuestsService {
  private readonly logger = new Logger(GuestsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CriarPessoaDto,
    operadorId: number, // Continuamos recebendo o ID seguro 1
  ): Promise<{ pessoa_id: string }> {
    const { pessoa } = dto;
    const docNumber = this.sanitizeString(pessoa.documento_id.numero_documento);
    if (!docNumber) throw new BadRequestException('Número do documento inválido');

    const exists = await this.prisma.hospede.findUnique({ where: { numeroDocumento: docNumber } });
    if (exists) throw new ConflictException('CPF/Passaporte já cadastrado');

    // Mapeia os dados salvando o ID relacional (1) no banco de dados
    const data = this.mapToCreateData(pessoa, docNumber, operadorId);
    const guest = await this.prisma.hospede.create({ data });

    // BUSCA O NOME REAL NO BANCO PARA O LOG (Ex: "Clara Maria")
    const operador = await this.prisma.usuario.findUnique({ where: { id: operadorId } });
    const nomeOperador = operador ? operador.nome : 'Sistema';

    // O Log agora exibe o NOME, mas o banco continua protegido pelo ID
    this.logger.log(
      `[AUDITORIA] Ação: REGISTRO_HÓSPEDE | Operador: [${nomeOperador}] | Status: SUCESSO | Hóspede: [${guest.nome}]`
    );

    return { pessoa_id: guest.id };
  }

  async findAll(): Promise<Hospede[]> {
    return this.prisma.hospede.findMany({ orderBy: { criadoEm: 'desc' } });
  }

  async findOne(id: string): Promise<Hospede> {
    const guest = await this.prisma.hospede.findUnique({ where: { id } });
    if (!guest) {
      throw new NotFoundException('Hóspede não encontrado no banco de dados');
    }
    return guest;
  }

  async update(
    id: string,
    dto: AtualizarPessoaDto,
    operadorId: number,
  ): Promise<{ pessoa_id: string }> {
    await this.findOne(id);
    const updateData: any = {};

    if (dto.pessoa) {
      const { pessoa } = dto;

      if (pessoa.documento_id) {
        const newDocNumber = this.sanitizeString(pessoa.documento_id.numero_documento);
        if (!newDocNumber) {
          throw new BadRequestException('Número do documento inválido');
        }
        
        const duplicate = await this.prisma.hospede.findFirst({
          where: { numeroDocumento: newDocNumber, NOT: { id } }
        });
        if (duplicate) {
          throw new ConflictException('O documento informado já pertence a outro hóspede');
        }
        updateData.numeroDocumento = newDocNumber;
        updateData.tipoDocumento = pessoa.documento_id.tipo_documento_id;
      }

      this.applyUpdateFields(updateData, pessoa);
    }

    updateData.atualizadoPorId = operadorId; 

    const updated = await this.prisma.hospede.update({
      where: { id },
      data: updateData,
    });

    // BUSCA O NOME REAL NO BANCO PARA O LOG
    const operador = await this.prisma.usuario.findUnique({ where: { id: operadorId } });
    const nomeOperador = operador ? operador.nome : 'Sistema';

    const propriedadesAlteradas = Object.keys(updateData).filter(key => key !== 'atualizadoPorId');
    this.logger.log(
      `[AUDITORIA] Ação: ALTERAÇÃO_HÓSPEDE | Operador: [${nomeOperador}] | Status: SUCESSO | Hóspede: [${updated.nome}] | Campos: [${propriedadesAlteradas.join(', ')}]`
    );

    return { pessoa_id: updated.id };
  }

  async remove(id: string): Promise<{ message: string }> {
    try {
      const deleted = await this.prisma.hospede.delete({ where: { id } });
      
      this.logger.warn(
        `[AUDITORIA] Ação: EXPURGO_HÓSPEDE | Operador: SYSTEM_CLEANUP | Status: EXECUTADO | Registro Excluído: ID [${id}] - Nome: [${deleted.nome}]`
      );
      
      return { message: 'Hóspede removido com sucesso' };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Hóspede não encontrado para remoção');
      }
      throw error;
    }
  }

  // -------- Camada de Mapeamento (DTO) -> Novo (Schema Prisma) --------

  private mapToCreateData(pessoa: any, docNumber: string, operadorId: number): Prisma.HospedeUncheckedCreateInput {
    return {
      criadoPorId: operadorId,
      nome: this.sanitizeString(pessoa.nome)!,
      nomeSocial: this.sanitizeNullableString(pessoa.nome_social),
      paisNacionalidade: pessoa.PaisNacionalidade_id || 'BR',
      genero: pessoa.genero_id,
      generoDescricao: pessoa.genero_id === 'OUTRO' ? this.sanitizeNullableString(pessoa.genero_descricao) : null,
      dataNascimento: new Date(`${pessoa.data_nascimento}T00:00:00.000Z`),
      raca: pessoa.raca_id || null,
      possuiDeficiencia: pessoa.deficiencia_id || 'NAO',
      tipoDeficiencia: pessoa.deficiencia_id === 'NAO' ? null : (pessoa.tipo_deficiencia_id || null),
      tipoDocumento: pessoa.documento_id.tipo_documento_id,
      numeroDocumento: docNumber,
      email: this.sanitizeNullableString(pessoa.contato?.email),
      telefone: this.sanitizeNullableString(pessoa.contato?.telefone),
      paisResidencia: pessoa.contato?.PaisResidencia_id || 'BR',
      cep: this.sanitizeNullableString(pessoa.contato?.cep),
      logradouro: this.sanitizeNullableString(pessoa.contato?.logradouro),
      numeroEndereco: this.sanitizeNullableString(pessoa.contato?.numero),
      complemento: this.sanitizeNullableString(pessoa.contato?.complemento),
      bairro: this.sanitizeNullableString(pessoa.contato?.bairro),
      codigoIbgeCidade: this.sanitizeNullableString(pessoa.contato?.cidade_id),
      nomeCidade: this.sanitizeNullableString(pessoa.contato?.cidade_nome), 
      estado: this.sanitizeNullableString(pessoa.contato?.estado_id),
    };
  }

  private applyUpdateFields(data: any, pessoa: any) {
    if (pessoa.nome !== undefined) data.nome = this.sanitizeString(pessoa.nome);
    
    if (pessoa.nome_social !== undefined) data.nomeSocial = this.sanitizeNullableString(pessoa.nome_social);
    if (pessoa.PaisNacionalidade_id !== undefined) data.paisNacionalidade = pessoa.PaisNacionalidade_id;
    if (pessoa.genero_id !== undefined) {
      data.genero = pessoa.genero_id;
      // Trava: Limpa a descrição se mudar para um gênero padrão
      if (pessoa.genero_id !== 'OUTRO') {
        data.generoDescricao = null;
      }
    }
    
    // Atualiza a descrição apenas se for enviada e o gênero for OUTRO
    if (pessoa.genero_descricao !== undefined) {
      // Confirma se o gênero novo (ou o atual) é OUTRO antes de aceitar a string
      if (data.genero === 'OUTRO' || pessoa.genero_id === 'OUTRO') {
        data.generoDescricao = this.sanitizeNullableString(pessoa.genero_descricao);
      }
    }
    if (pessoa.data_nascimento !== undefined) data.dataNascimento = new Date(`${pessoa.data_nascimento}T00:00:00.000Z`);
    if (pessoa.raca_id !== undefined) data.raca = this.sanitizeNullableString(pessoa.raca_id);
    
    if (pessoa.deficiencia_id !== undefined) {
      data.possuiDeficiencia = pessoa.deficiencia_id;
      if (pessoa.deficiencia_id === 'NAO') {
        data.tipoDeficiencia = null;
      }
    }
    
    if (pessoa.tipo_deficiencia_id !== undefined && data.tipoDeficiencia !== null) {
      data.tipoDeficiencia = this.sanitizeNullableString(pessoa.tipo_deficiencia_id);
    }

    if (pessoa.contato) {
      const c = pessoa.contato;
      if (c.email !== undefined) data.email = this.sanitizeNullableString(c.email);
      if (c.telefone !== undefined) data.telefone = this.sanitizeNullableString(c.telefone);
      if (c.PaisResidencia_id !== undefined) data.paisResidencia = c.PaisResidencia_id;
      if (c.cep !== undefined) data.cep = this.sanitizeNullableString(c.cep);
      if (c.logradouro !== undefined) data.logradouro = this.sanitizeNullableString(c.logradouro);
      if (c.numero !== undefined) data.numeroEndereco = this.sanitizeNullableString(c.numero);
      if (c.complemento !== undefined) data.complemento = this.sanitizeNullableString(c.complemento);
      if (c.bairro !== undefined) data.bairro = this.sanitizeNullableString(c.bairro);
      if (c.cidade_id !== undefined) data.codigoIbgeCidade = this.sanitizeNullableString(c.cidade_id);
      if (c.cidade_nome !== undefined) data.nomeCidade = this.sanitizeNullableString(c.cidade_nome);
      if (c.estado_id !== undefined) data.estado = this.sanitizeNullableString(c.estado_id);
    }
  }

  private sanitizeString(value?: string): string | undefined {
    if (value === null || value === undefined) return undefined;
    const str = value.trim();
    return str || undefined;
  }

  private sanitizeNullableString(value?: string | null): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const str = value.trim();
    return str || null;
  }
}