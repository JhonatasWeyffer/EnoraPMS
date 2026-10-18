import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      // Extrai o token do cabeçalho "Authorization: Bearer <TOKEN>"
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Pega a chave secreta do seu .env
      secretOrKey: configService.get<string>('JWT_SECRET') || 'fallback_secret', // Nunca use um fallback em produção!
    });
  }

  /**
   * O NestJS chama essa função automaticamente se o token for válido e não estiver expirado.
   * O que retornarmos aqui será injetado no `req.user` de todos os controllers protegidos.
   */
  async validate(payload: any) {
    // Validação extra de segurança: Verifica se o usuário ainda existe no banco
    const user = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário revogado ou inexistente.');
    }

    // Retorna os dados que ficarão disponíveis no req.user
    // O CPF é obrigatório para o header 'cpf_solicitante' nas requisições FNRH v2
    return { 
      sub: payload.sub, 
      role: payload.role,
      cpf: user.cpf,
    };
  }
}