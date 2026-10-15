import { StatusGovernanca, PrioridadeManutencao } from '@prisma/client';
import { IsInt, IsOptional, IsString, IsEnum, IsDateString, IsNotEmpty } from 'class-validator';

export class CreateHousekeepingTaskDto {
  @IsNotEmpty()
  @IsInt()
  quartoId!: number;

  @IsOptional()
  @IsString()
  tipo?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsEnum(StatusGovernanca)
  status?: StatusGovernanca;

  @IsOptional()
  @IsEnum(PrioridadeManutencao)
  prioridade?: PrioridadeManutencao;

  @IsOptional()
  @IsDateString()
  dataPrevista?: Date;
}

export class UpdateHousekeepingTaskDto {
  @IsOptional()
  @IsInt()
  quartoId?: number;

  @IsOptional()
  @IsString()
  tipo?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsEnum(StatusGovernanca)
  status?: StatusGovernanca;

  @IsOptional()
  @IsEnum(PrioridadeManutencao)
  prioridade?: PrioridadeManutencao;

  @IsOptional()
  @IsDateString()
  dataPrevista?: Date;
}