import { IsOptional, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PagamentoDto {
  @IsNumber()
  valor!: number;

  @IsString()
  forma!: string;
}

export class CheckOperationDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => PagamentoDto)
  pagamento?: PagamentoDto;
}