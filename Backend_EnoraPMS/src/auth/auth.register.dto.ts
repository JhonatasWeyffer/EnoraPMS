import { IsEmail, IsEnum, IsNotEmpty, IsString, MaxLength, MinLength, Length } from 'class-validator';
import { Perfil } from '@prisma/client';

export class RegisterDto {
  @IsString({ message: 'O nome deve ser uma string.' })
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  nome!: string;

  @IsEmail({}, { message: 'O formato do e-mail é inválido.' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório.' })
  email!: string;

  @IsString({ message: 'A senha deve ser uma string.' })
  @IsNotEmpty({ message: 'A senha é obrigatória.' })
  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres.' })
  @MaxLength(64, { message: 'A senha excede o limite máximo permitido.' })
  senha!: string;

  @IsEnum(Perfil, { message: 'Perfil inválido.' })
  @IsNotEmpty({ message: 'O perfil é obrigatório.' })
  perfil!: Perfil;

  @IsString({ message: 'O CPF deve ser uma string.' })
  @IsNotEmpty({ message: 'O CPF é obrigatório.' })
  @Length(11, 11, { message: 'O CPF deve conter exatamente 11 caracteres (sem pontos ou traços).' })
  cpf!: string;
}