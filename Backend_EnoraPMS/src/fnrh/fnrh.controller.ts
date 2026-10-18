import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FnrhService } from './fnrh.service';
import { SaveConfigDto } from './fnrh.dto';
import type { Request } from 'express';

// Extensão de tipo para enriquecer o req.user com os dados do JWT
interface JwtUser {
  sub: number;
  role: string;
  cpf: string;
}

@UseGuards(AuthGuard('jwt'))
@Controller('fnrh')
export class FnrhController {
  constructor(private readonly fnrhService: FnrhService) {}

  // ----------------------------------------------------------------
  // ROTAS DE CONFIGURAÇÃO
  // ----------------------------------------------------------------

  /**
   * GET /v2/fnrh/config
   * Retorna o status da integração (se está configurada e qual o usuário API).
   * Nunca devolve a chave em texto puro.
   */
  @Get('config')
  @HttpCode(HttpStatus.OK)
  getConfig() {
    return this.fnrhService.getConfig();
  }

  /**
   * POST /v2/fnrh/config
   * Salva/atualiza as credenciais Serpro.
   */
  @Post('config')
  @HttpCode(HttpStatus.OK)
  saveConfig(@Body() dto: SaveConfigDto) {
    return this.fnrhService.saveConfig(dto);
  }

  // ----------------------------------------------------------------
  // ROTAS DE CONSULTA
  // ----------------------------------------------------------------

  /**
   * GET /v2/fnrh/pessoa/:cpf
   * Consulta a pessoa pelo CPF na API Serpro FNRH v2.
   *
   * Regra de Segurança: o CPF do operador logado é extraído do JWT (req.user.cpf)
   * e enviado no header obrigatório 'cpf_solicitante' do Serpro.
   */
  @Get('pessoa/:cpf')
  @HttpCode(HttpStatus.OK)
  buscarPorCPF(@Param('cpf') cpf: string, @Req() req: Request) {
    const operador = req.user as JwtUser;
    return this.fnrhService.buscarPorCPF(cpf, operador.cpf);
  }
}
