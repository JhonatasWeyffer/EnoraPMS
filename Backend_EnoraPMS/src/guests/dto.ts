import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsEmail,
  IsDateString,
  MinLength,
  Matches,
  ValidateNested,
  ValidateIf,
  Length,
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
// CORREÇÃO: Importação do Transform para interceptar strings vazias do formulário
import { Type, Transform } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';

/** === Validador customizado de CPF === */
@ValidatorConstraint({ async: false })
export class IsCPFValidConstraint implements ValidatorConstraintInterface {
  validate(cpf: string) {
    if (!cpf) return false;
    cpf = cpf.replace(/[^\d]/g, '');
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(cpf.charAt(i)) * (10 - i);
    let digit = 11 - (sum % 11);
    if (digit > 9) digit = 0;
    if (digit !== parseInt(cpf.charAt(9))) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(cpf.charAt(i)) * (11 - i);
    digit = 11 - (sum % 11);
    if (digit > 9) digit = 0;
    if (digit !== parseInt(cpf.charAt(10))) return false;

    return true;
  }

  defaultMessage() {
    return 'CPF inválido';
  }
}

export function IsCPFValid(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsCPFValidConstraint,
    });
  };
}

/** === DocumentoDto === */
class DocumentoDto {
  @IsString()
  @IsNotEmpty({ message: 'Número do documento é obrigatório' })
  @ValidateIf((o) => o.tipo_documento_id === 'CPF')
  @IsCPFValid({ message: 'CPF inválido' })
  numero_documento!: string;

  @IsString()
  @IsIn(['CPF', 'PASSAPORTE'], { message: 'Tipo de documento inválido' })
  tipo_documento_id!: string;
}

/** === ContatoDto === */
class ContatoDto {
  @IsEmail({}, { message: 'Email inválido' })
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value) // Transforma "" em undefined
  email?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  @Matches(/^\d{10,11}$/, { message: 'Telefone deve ter 10 ou 11 dígitos' })
  telefone?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  PaisResidencia_id?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  @Matches(/^\d{8}$/, { message: 'CEP deve ter 8 dígitos' })
  cep?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  logradouro?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  numero?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  complemento?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  bairro?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  @Matches(/^\d{7}$/, { message: 'Código IBGE deve ter 7 dígitos' })
  cidade_id?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  cidade_nome?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  @Length(2, 2, { message: 'Estado deve ter 2 caracteres' })
  estado_id?: string;
}

/** === PessoaDto === */
class PessoaDto {
  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @MinLength(3, { message: 'Nome deve ter no mínimo 3 caracteres' })
  nome!: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  nome_social?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  PaisNacionalidade_id?: string;

  @IsString()
  @IsNotEmpty({ message: 'Gênero é obrigatório' })
  @IsIn(['HOMEM', 'MULHER', 'OUTRO', 'NAOINFORMADO'], { message: 'Gênero inválido' })
  genero_id!: string;

  @IsDateString({}, { message: 'Data de nascimento inválida' })
  @IsNotEmpty({ message: 'Data de nascimento é obrigatória' })
  data_nascimento!: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsIn(['AMARELA', 'BRANCA', 'INDIGENA', 'PARDA', 'PRETA', 'NAOINFORMAR'], { message: 'Raça inválida' })
  raca_id?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsIn(['NAO', 'SIM', 'NAOINFORMAR'], { message: 'Opção de deficiência inválida' })
  deficiencia_id?: string;

  @ValidateIf((o) => o.deficiencia_id === 'SIM')
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsNotEmpty({ message: 'Tipo de deficiência é obrigatório quando deficiência = SIM' })
  @IsIn(['FISICA', 'AUDITIVA_SURDEZ', 'VISUAL', 'INTELECTUAL', 'MULTIPLA'], {
    message: 'Tipo de deficiência inválido',
  })
  tipo_deficiencia_id?: string;

  @ValidateNested()
  @Type(() => DocumentoDto)
  documento_id!: DocumentoDto;

  @ValidateNested()
  @Type(() => ContatoDto)
  contato!: ContatoDto;
}

export class CriarPessoaDto {
  @ValidateNested()
  @Type(() => PessoaDto)
  pessoa!: PessoaDto;
}

export class AtualizarPessoaDto extends PartialType(CriarPessoaDto) {}