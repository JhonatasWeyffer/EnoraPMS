import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { RegisterDto } from './auth.register.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * Realiza a autenticação com auditoria militar (Sucessos e Falhas)
   */
  async login(email: string, password: string, ip: string, userAgent: string) {
    // 1. Busca o usuário no banco
    const user = await this.prisma.usuario.findUnique({
      where: { email },
    });

    // 2. Se o usuário não existir, grava a tentativa de invasão e bloqueia
    if (!user) {
      await this.registrarLogAcesso(null, email, ip, userAgent, false);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // 3. Verifica a senha com Argon2
    const isPasswordValid = await argon2.verify(user.senhaHash, password);

    // 4. Se a senha errar, grava a falha atrelada ao usuário real e bloqueia
    if (!isPasswordValid) {
      await this.registrarLogAcesso(user.id, email, ip, userAgent, false);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // 5. Autenticação bem-sucedida: Grava o log de sucesso
    await this.registrarLogAcesso(user.id, email, ip, userAgent, true);

    // 6. Monta o Payload do JWT
    const tokenPayload = {
      sub: user.id, 
      role: user.perfil,
    };

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.nome,
        role: user.perfil,
        cpf: user.cpf, // OBRIGATÓRIO PARA A FNRH v2 (Header cpf_solicitante)
      },
      access_token: this.jwtService.sign(tokenPayload),
    };
  }

  /**
   * Registra um novo usuário no sistema do hotel
   */
  async register(data: RegisterDto) {
    const emailExists = await this.prisma.usuario.findUnique({
      where: { email: data.email },
    });

    if (emailExists) {
      throw new ConflictException('Este e-mail já está cadastrado no sistema.');
    }

    // Verifica se o CPF já está registrado (para evitar colisões na auditoria)
    const cpfExists = await this.prisma.usuario.findUnique({
      where: { cpf: data.cpf },
    });

    if (cpfExists) {
      throw new ConflictException('Este CPF já está registrado no sistema.');
    }

    const senhaHash = await argon2.hash(data.senha);

    const newUser = await this.prisma.usuario.create({
      data: {
        nome: data.nome,
        email: data.email,
        cpf: data.cpf, // Repassando o CPF exigido pelo novo Schema
        senhaHash,
        perfil: data.perfil as any,
      },
    });

    return {
      id: newUser.id,
      nome: newUser.nome,
      email: newUser.email,
      cpf: newUser.cpf,
      perfil: newUser.perfil,
    };
  }

  /**
   * Retorna todos os usuários (omitindo a senha hash por segurança)
   */
  async getAllUsers() {
    return this.prisma.usuario.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        cpf: true,
        perfil: true,
      },
      orderBy: { id: 'desc' },
    });
  }

  /**
   * Altera a senha de um usuário específico
   */
  async changeUserPassword(id: number, novaSenha: string) {
    const userExists = await this.prisma.usuario.findUnique({ where: { id } });
    
    if (!userExists) {
      throw new ConflictException('Usuário não encontrado.');
    }

    const senhaHash = await argon2.hash(novaSenha);

    await this.prisma.usuario.update({
      where: { id },
      data: { senhaHash },
    });

    return { message: 'Senha atualizada com sucesso' };
  }

  /**
   * Função privada auxiliar para consolidar a escrita do log de auditoria - Realmente não sei pq eu ainda não sei como funciona, mas funciona, então não mexa. 
   *                                                                      Se quiser entender então lê a droga documentação do Prisma sobre eventos e logs.
   */
  private async registrarLogAcesso(
    usuarioId: number | null, 
    email: string, 
    ip: string, 
    userAgent: string, 
    tentativa: boolean
  ) {
    // Rodamos de forma assíncrona sem travar o event loop principal ('fire and forget' estruturado)
    this.prisma.logAcesso.create({
      data: {
        usuarioId,
        emailTentado: email,
        ip,
        userAgent,
        tentativa,
      }
    }).catch(err => {
      // Falhas no log não devem derrubar o login, mas devem alertar a infraestrutura
      console.error('[ERRO CRÍTICO] Falha ao gravar log de acesso:', err);
    });
  }

  /**
   * Atualiza nome, e-mail, cpf e perfil de um usuário específico
   */
  async updateUser(id: number, data: { nome: string; email: string; cpf?: string; perfil: string }) {
    const userExists = await this.prisma.usuario.findUnique({ where: { id } });
    if (!userExists) {
      throw new ConflictException('Usuário não encontrado.');
    }

    if (data.email && data.email !== userExists.email) {
      const emailInUse = await this.prisma.usuario.findUnique({ where: { email: data.email } });
      if (emailInUse) {
        throw new ConflictException('Este e-mail já está em uso por outro usuário.');
      }
    }

    if (data.cpf && data.cpf !== userExists.cpf) {
      const cpfInUse = await this.prisma.usuario.findUnique({ where: { cpf: data.cpf } });
      if (cpfInUse) {
        throw new ConflictException('Este CPF já está em uso por outro usuário.');
      }
    }

    return this.prisma.usuario.update({
      where: { id },
      data: {
        nome: data.nome,
        email: data.email,
        ...(data.cpf && { cpf: data.cpf }), // Atualiza o CPF se for enviado
        perfil: data.perfil as any,
      },
      select: { id: true, nome: true, email: true, cpf: true, perfil: true }
    });
  }
}