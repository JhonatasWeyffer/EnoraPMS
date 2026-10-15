import { IsString, IsNumber, IsEnum, IsOptional, IsNotEmpty, IsUUID } from 'class-validator';
import { TipoTransacao } from '@prisma/client';

export class CreateTransactionDto {
  @IsNotEmpty()
  @IsString()
  descricao!: string;

  @IsNotEmpty()
  @IsNumber()
  valor!: number;

  @IsNotEmpty()
  @IsString()
  metodo!: string;

  @IsNotEmpty()
  @IsEnum(TipoTransacao)
  tipo!: TipoTransacao;

  @IsOptional()
  @IsUUID()
  reservaId?: string;
}