import { 
  Injectable, 
  NotFoundException, 
  ConflictException, 
  BadRequestException 
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  // Listar todas as empresas com seus respectivos funcionários (agora com o hóspede real)
  async findAll() {
    return await this.prisma.empresa.findMany({
      include: {
        funcionarios: {
          include: { hospede: true } 
        },
      },
      orderBy: {
        razaoSocial: 'asc',
      },
    });
  }

  // Cadastrar uma nova empresa / convênio
  async createCompany(data: { 
    razaoSocial: string; 
    cnpj: string; 
    desconto: number; 
    valorBaseDiaria?: number;
    contatoFinanceiroNome?: string;
    contatoFinanceiroTipoDoc?: string;
    contatoFinanceiroNumDoc?: string;
  }) {
    const limpoCnpj = data.cnpj.replace(/\D/g, ''); // Limpa máscara do front

    // 1. MELHORIA: Evita duplicação de CNPJ
    const empresaExistente = await this.prisma.empresa.findUnique({ 
      where: { cnpj: limpoCnpj } 
    });
    if (empresaExistente) {
      throw new ConflictException('Já existe um convênio cadastrado com este CNPJ.');
    }

    return await this.prisma.empresa.create({
      data: {
        razaoSocial: data.razaoSocial,
        cnpj: limpoCnpj,
        desconto: data.desconto,
        // 2. MELHORIA: Remove hardcode estrito, aceita valor dinâmico com fallback
        valorBaseDiaria: data.valorBaseDiaria ?? 80.00, 
        contatoFinanceiroNome: data.contatoFinanceiroNome,
        contatoFinanceiroTipoDoc: data.contatoFinanceiroTipoDoc,
        contatoFinanceiroNumDoc: data.contatoFinanceiroNumDoc?.replace(/\D/g, ''),
      },
      include: { funcionarios: true }
    });
  }

  // Cadastrar um novo funcionário (Exige UUID do hóspede existente)
  async createEmployee(empresaId: number, data: { hospedeId: string }) {
    const empresaExiste = await this.prisma.empresa.findUnique({ where: { id: empresaId } });
    if (!empresaExiste) {
      throw new NotFoundException('Empresa não encontrada.');
    }

    const hospedeExiste = await this.prisma.hospede.findUnique({ where: { id: data.hospedeId } });
    if (!hospedeExiste) {
      throw new NotFoundException('Hóspede não encontrado no sistema.');
    }

    // 3. MELHORIA: Evita que o mesmo hóspede seja vinculado duas vezes à mesma empresa
    const vinculoDuplicado = await this.prisma.funcionario.findFirst({
      where: { empresaId: empresaId, hospedeId: data.hospedeId }
    });
    if (vinculoDuplicado) {
      throw new ConflictException('Este hóspede já está vinculado a esta empresa.');
    }

    return await this.prisma.funcionario.create({
      data: {
        empresaId: empresaId,
        hospedeId: data.hospedeId,
        hospedadoAtualmente: false, 
      },
    });
  }

  // O fechamento de fatura precisará ser reescrito na Fase 3.
  async closeInvoice(empresaId: number, activeEmployeeIds: number[]) {
    // AVISO ESTRUTURAL: Esta lógica apenas altera uma flag. Futuramente, 
    // isso deve gerar um registro na tabela `Financeiro`.
    await this.prisma.funcionario.updateMany({
      where: { empresaId: empresaId },
      data: { hospedadoAtualmente: false },
    });

    if (activeEmployeeIds && activeEmployeeIds.length > 0) {
      await this.prisma.funcionario.updateMany({
        where: {
          id: { in: activeEmployeeIds },
          empresaId: empresaId,
        },
        data: { hospedadoAtualmente: true },
      });
    }
    return await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      include: { funcionarios: true },
    });
  }

  async removeCompany(id: number) {
    // 4. MELHORIA: Verifica se a empresa tem funcionários para evitar erro de Foreign Key (HTTP 500)
    const empresa = await this.prisma.empresa.findUnique({ 
      where: { id },
      include: { _count: { select: { funcionarios: true } } }
    });
    
    if (!empresa) throw new NotFoundException('Convênio não encontrado.');
    
    if (empresa._count.funcionarios > 0) {
      throw new BadRequestException('Não é possível excluir um convênio que possui funcionários vinculados. Remova os vínculos primeiro.');
    }

    return await this.prisma.empresa.delete({ where: { id } });
  }

  async removeEmployee(funcionarioId: number) {
    const funcionario = await this.prisma.funcionario.findUnique({ where: { id: funcionarioId } });
    if (!funcionario) throw new NotFoundException('Vínculo não encontrado.');
    
    return await this.prisma.funcionario.delete({ where: { id: funcionarioId } });
  }

  async updateFinanceResp(id: number, data: { 
    contatoFinanceiroNome: string; 
    contatoFinanceiroTipoDoc: string; 
    contatoFinanceiroNumDoc: string; 
  }) {
    const empresa = await this.prisma.empresa.findUnique({ where: { id } });
    if (!empresa) throw new NotFoundException('Convênio não encontrado para atualização.');
    
    return await this.prisma.empresa.update({
      where: { id },
      data: {
        contatoFinanceiroNome: data.contatoFinanceiroNome,
        contatoFinanceiroTipoDoc: data.contatoFinanceiroTipoDoc,
        // Limpa a formatação de documentos antes de salvar
        contatoFinanceiroNumDoc: data.contatoFinanceiroNumDoc?.replace(/\D/g, ''),
      },
      include: { funcionarios: true }, 
    });
  }
}