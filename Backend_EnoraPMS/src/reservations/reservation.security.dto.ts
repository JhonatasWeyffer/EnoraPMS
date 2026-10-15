import { IsNotEmpty, IsString, IsOptional, IsNumber, IsInt, Min, IsDateString } from 'class-validator';

export class BuscarHospedeDto {
  @IsString()
  @IsNotEmpty()
  tipo_documento!: string;

  @IsString()
  @IsNotEmpty()
  numero_documento!: string;
}

export class CriarReservaDto {
  @IsString() @IsOptional() hospede_id?: string;
  @IsString() @IsOptional() hospede_nome?: string;
  @IsString() @IsOptional() tipo_documento?: string;
  @IsString() @IsOptional() numero_documento?: string;

  @IsDateString() @IsNotEmpty() data_entrada!: string;
  @IsDateString() @IsNotEmpty() data_saida!: string;
  @IsString() @IsNotEmpty() quarto!: string;

  @IsInt() @Min(1) quantidade_hospede_adulto!: number;
  @IsInt() @Min(0) quantidade_hospede_menor!: number;

  @IsString() @IsNotEmpty() meio_transporte!: string;
  @IsString() @IsNotEmpty() motivo_viagem!: string;
  @IsString() @IsOptional() origem_reserva_id?: string;
  @IsNumber() @IsOptional() valor_total?: number;
  @IsString() @IsOptional() forma_pagamento?: string;
  @IsString() @IsOptional() status_pagamento?: string;
  @IsDateString() @IsOptional() pago_em?: string;
}

export class AtualizarReservaDto {
  @IsString() @IsOptional() hospede_id?: string;
  
  // --- CAMPOS ADICIONADOS PARA PERMITIR A ATUALIZAÇÃO ---
  @IsString() @IsOptional() hospede_nome?: string;
  @IsString() @IsOptional() tipo_documento?: string;
  @IsString() @IsOptional() numero_documento?: string;
  // ------------------------------------------------------

  @IsDateString() @IsOptional() data_entrada?: string;
  @IsDateString() @IsOptional() data_saida?: string;
  @IsString() @IsOptional() quarto?: string;
  
  @IsInt() @IsOptional() @Min(1) quantidade_hospede_adulto?: number;
  @IsInt() @IsOptional() @Min(0) quantidade_hospede_menor?: number;

  @IsString() @IsOptional() meio_transporte?: string;
  @IsString() @IsOptional() motivo_viagem?: string;
  @IsString() @IsOptional() origem_reserva_id?: string;
  @IsNumber() @IsOptional() valor_total?: number;
  @IsString() @IsOptional() forma_pagamento?: string;
  @IsString() @IsOptional() status_pagamento?: string;
  @IsDateString() @IsOptional() pago_em?: string;
}

export class VincularHospedeDto {
  @IsString()
  @IsNotEmpty()
  hote_guest_id!: string;
}

export class AtualizarStatusHospedeDto {
  @IsString()
  @IsNotEmpty()
  status!: string;

  @IsDateString()
  @IsOptional()
  data_hora?: string;
}