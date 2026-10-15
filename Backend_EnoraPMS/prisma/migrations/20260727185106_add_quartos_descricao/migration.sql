-- AlterTable
ALTER TABLE "Quarto" ADD COLUMN     "andar" INTEGER,
ADD COLUMN     "bloco" TEXT,
ADD COLUMN     "tipo" TEXT NOT NULL DEFAULT 'Não definido';
