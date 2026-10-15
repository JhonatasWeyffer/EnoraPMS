import { Controller, Post, Body, HttpCode, HttpStatus, Req, Get, Patch, Param, ParseIntPipe } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './auth.register.dto';
import type { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: any, @Req() req: Request) {
    // Captura o IP (trata casos onde a API está atrás de um proxy/load balancer)
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress || 'IP_DESCONHECIDO';
    
    // Captura o dispositivo/navegador
    const userAgent = req.headers['user-agent'] || 'DESCONHECIDO';

    // Repassa para o serviço auditar e autenticar
    return this.authService.login(loginDto.email, loginDto.senha, ip, userAgent);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Get('users')
  @HttpCode(HttpStatus.OK)
  getAllUsers() {
    return this.authService.getAllUsers();
  }

  @Patch('users/:id/password')
  @HttpCode(HttpStatus.OK)
  changePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { novaSenha: string }
  ) {
    return this.authService.changeUserPassword(id, body.novaSenha);
  }

  @Patch('users/:id')
  @HttpCode(HttpStatus.OK)
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { nome: string; email: string; perfil: string }
  ) {
    return this.authService.updateUser(id, body);
  }
}