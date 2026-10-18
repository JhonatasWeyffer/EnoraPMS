import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class SaveConfigDto {
  @IsString()
  @IsNotEmpty({ message: 'O usuário API é obrigatório.' })
  @MaxLength(200)
  serpro_usuario!: string;

  @IsString()
  @IsNotEmpty({ message: 'A chave API é obrigatória.' })
  @MaxLength(500)
  serpro_chave!: string;
}
