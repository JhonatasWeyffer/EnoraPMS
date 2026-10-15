import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * Filtro global de exceções.
 * Formata erros no padrão:
 * {
 *   statusCode: number,
 *   message: string,
 *   errors: { [campo]: mensagem },
 *   timestamp: string
 * }
 * Trata também erros internos (500) sem vazar detalhes.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erro interno do servidor';
    let errors: Record<string, string> | undefined = undefined;

    if (exception instanceof BadRequestException) {
      statusCode = exception.getStatus();
      const responseBody = exception.getResponse();

      // Se for erro de validação (class-validator), tem `message` como array ou objeto
      if (typeof responseBody === 'object' && responseBody !== null) {
        const body = responseBody as any;
        message = body.message || 'Erro de validação';

        // Tenta extrair erros de validação e achatar chaves aninhadas
        if (Array.isArray(body.message)) {
          errors = this.flattenValidationErrors(body.message);
        } else if (typeof body.message === 'string') {
          // Erro de validação simples (ex: manual)
          message = body.message;
        }
      }
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as any).message || exception.message;
      // Para Conflict, NotFound, etc., mantemos apenas a mensagem, sem campo "errors"
    } else if (exception instanceof Error) {
      // Erro não tratado
      this.logger.error('Erro não tratado', exception.stack);
    }

    response.status(statusCode).json({
      statusCode,
      message,
      errors,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Achata as mensagens de validação do class-validator.
   * Exemplo: "pessoa.nome" -> "nome", "pessoa.contato.email" -> "email"
   */
  private flattenValidationErrors(messages: string[]): Record<string, string> {
    const flat: Record<string, string> = {};
    for (const msg of messages) {
      // Procura a primeira ocorrência de " " para separar campo da mensagem
      const firstSpace = msg.indexOf(' ');
      if (firstSpace === -1) {
        // Se não houver espaço, pode ser só a mensagem
        flat['_generic'] = msg;
        continue;
      }
      let field = msg.substring(0, firstSpace);
      const errorMsg = msg.substring(firstSpace + 1);

      // Remove o prefixo "pessoa." (pode vir de várias raízes)
      field = field.replace(/^pessoa\./, '');
      // Para campos mais profundos, extrai a última parte
      // Ex: "documento_id.numero_documento" -> "documento_id.numero_documento" (já é útil)
      flat[field] = errorMsg;
    }
    return flat;
  }
}