import { IsNotEmpty, IsDateString, IsEnum } from 'class-validator';
import { SituacaoQuarto } from '@prisma/client'; // Importa o tipo gerado pelo Prisma

export class UpdateRoomStatusDto {
  @IsEnum(SituacaoQuarto, { message: 'A situação fornecida é inválida para o cadastro do hotel.' })
  @IsNotEmpty({ message: 'A situação é obrigatória.' })
  situacao!: SituacaoQuarto; // Tipagem estrita com o Enum

  @IsDateString({}, { message: 'A data deve estar em formato ISO válido (YYYY-MM-DD).' })
  @IsNotEmpty({ message: 'A data é obrigatória.' })
  data!: string;
}