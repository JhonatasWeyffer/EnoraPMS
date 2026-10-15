-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('ADMINISTRADOR', 'GERENTE', 'SUPORTE_TI', 'COLABORADOR');

-- CreateEnum
CREATE TYPE "SituacaoQuarto" AS ENUM ('LIVRE', 'MANUTENCAO', 'RESERVADO', 'OCUPADO', 'LIMPEZA');

-- CreateEnum
CREATE TYPE "StatusReserva" AS ENUM ('CRIADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA', 'NOSHOW');

-- CreateEnum
CREATE TYPE "StatusHospede" AS ENUM ('AGUARDANDO_CHECKIN', 'PRECHECKIN_PENDENTE', 'PRECHECKIN_REALIZADO', 'CHECKIN_REALIZADO', 'CHECKOUT_REALIZADO', 'NOSHOW');

-- CreateEnum
CREATE TYPE "StatusManutencao" AS ENUM ('EM_ABERTO', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "PrioridadeManutencao" AS ENUM ('ALTA', 'MEDIA', 'BAIXA');

-- CreateEnum
CREATE TYPE "TipoTransacao" AS ENUM ('RECEITA', 'DESPESA');

-- CreateEnum
CREATE TYPE "StatusGovernanca" AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL DEFAULT 'COLABORADOR',

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogAcesso" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER,
    "emailTentado" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "userAgent" TEXT,
    "tentativa" BOOLEAN NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogAcesso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quarto" (
    "id" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,

    CONSTRAINT "Quarto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusQuarto" (
    "id" SERIAL NOT NULL,
    "quartoId" INTEGER NOT NULL,
    "situacao" "SituacaoQuarto" NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusQuarto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hospede" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "nomeSocial" TEXT,
    "paisNacionalidade" TEXT NOT NULL DEFAULT 'BR',
    "genero" TEXT NOT NULL,
    "generoDescricao" TEXT,
    "dataNascimento" DATE NOT NULL,
    "raca" TEXT,
    "possuiDeficiencia" TEXT NOT NULL DEFAULT 'NAO',
    "tipoDeficiencia" TEXT,
    "tipoDocumento" TEXT NOT NULL DEFAULT 'CPF',
    "numeroDocumento" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "paisResidencia" TEXT NOT NULL DEFAULT 'BR',
    "cep" TEXT,
    "logradouro" TEXT,
    "numeroEndereco" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "codigoIbgeCidade" TEXT,
    "nomeCidade" TEXT,
    "estado" TEXT,
    "criadoPorId" INTEGER,
    "atualizadoPorId" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hospede_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reserva" (
    "id" UUID NOT NULL,
    "numeroReserva" TEXT NOT NULL,
    "numeroReservaOta" TEXT,
    "dataEntrada" DATE NOT NULL,
    "dataSaida" DATE NOT NULL,
    "origemReservaId" TEXT NOT NULL DEFAULT 'MEIOHOSPEDAGEM',
    "situacao" "StatusReserva" NOT NULL DEFAULT 'CRIADA',
    "quartoId" INTEGER,
    "valorTotal" DECIMAL(10,2),
    "formaPagamento" TEXT,
    "statusPagamento" TEXT NOT NULL DEFAULT 'pendente',
    "pagoEm" DATE,
    "meioTransporte" TEXT NOT NULL,
    "motivoViagem" TEXT NOT NULL,
    "linkPreCheckin" TEXT,
    "quantidadeHospedeAdulto" INTEGER NOT NULL DEFAULT 1,
    "quantidadeHospedeMenor" INTEGER NOT NULL DEFAULT 0,
    "hospedeResponsavelId" UUID NOT NULL,
    "empresaId" INTEGER,
    "criadoPorId" INTEGER,
    "atualizadoPorId" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "canceladoPorId" INTEGER,
    "canceladoEm" TIMESTAMP(3),

    CONSTRAINT "Reserva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReservaHospede" (
    "id" UUID NOT NULL,
    "reservaId" UUID NOT NULL,
    "hospedeId" UUID NOT NULL,
    "situacao" "StatusHospede" NOT NULL DEFAULT 'AGUARDANDO_CHECKIN',
    "responsavel" BOOLEAN NOT NULL DEFAULT false,
    "preCheckinEm" TIMESTAMP(3),
    "checkinEm" TIMESTAMP(3),
    "checkoutEm" TIMESTAMP(3),
    "noShowEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReservaHospede_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Empresa" (
    "id" SERIAL NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "desconto" DECIMAL(5,2) NOT NULL,
    "valorBaseDiaria" DECIMAL(10,2) NOT NULL DEFAULT 80.00,
    "contatoFinanceiroNome" TEXT,
    "contatoFinanceiroTipoDoc" TEXT,
    "contatoFinanceiroNumDoc" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Funcionario" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "hospedeId" UUID NOT NULL,
    "hospedadoAtualmente" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Funcionario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Manutencao" (
    "id" SERIAL NOT NULL,
    "quartoId" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "prioridade" "PrioridadeManutencao" NOT NULL DEFAULT 'MEDIA',
    "status" "StatusManutencao" NOT NULL DEFAULT 'EM_ABERTO',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Manutencao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Governanca" (
    "id" SERIAL NOT NULL,
    "quartoId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'Check-out',
    "descricao" TEXT,
    "status" "StatusGovernanca" NOT NULL DEFAULT 'PENDENTE',
    "prioridade" "PrioridadeManutencao" NOT NULL DEFAULT 'MEDIA',
    "dataPrevista" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Governanca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Financeiro" (
    "id" SERIAL NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "metodo" TEXT NOT NULL,
    "tipo" "TipoTransacao" NOT NULL,
    "reservaId" UUID,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Financeiro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LembreteTurno" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT,
    "descricao" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LembreteTurno_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "LogAcesso_emailTentado_idx" ON "LogAcesso"("emailTentado");

-- CreateIndex
CREATE INDEX "LogAcesso_criadoEm_idx" ON "LogAcesso"("criadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "Quarto_numero_key" ON "Quarto"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Hospede_numeroDocumento_key" ON "Hospede"("numeroDocumento");

-- CreateIndex
CREATE INDEX "Hospede_email_idx" ON "Hospede"("email");

-- CreateIndex
CREATE INDEX "Hospede_nome_idx" ON "Hospede"("nome");

-- CreateIndex
CREATE INDEX "Hospede_criadoEm_idx" ON "Hospede"("criadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "Reserva_numeroReserva_key" ON "Reserva"("numeroReserva");

-- CreateIndex
CREATE INDEX "Reserva_quartoId_situacao_dataEntrada_dataSaida_idx" ON "Reserva"("quartoId", "situacao", "dataEntrada", "dataSaida");

-- CreateIndex
CREATE INDEX "Reserva_hospedeResponsavelId_idx" ON "Reserva"("hospedeResponsavelId");

-- CreateIndex
CREATE UNIQUE INDEX "ReservaHospede_reservaId_hospedeId_key" ON "ReservaHospede"("reservaId", "hospedeId");

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_cnpj_key" ON "Empresa"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "Funcionario_empresaId_hospedeId_key" ON "Funcionario"("empresaId", "hospedeId");

-- CreateIndex
CREATE INDEX "Governanca_dataPrevista_idx" ON "Governanca"("dataPrevista");

-- AddForeignKey
ALTER TABLE "LogAcesso" ADD CONSTRAINT "LogAcesso_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusQuarto" ADD CONSTRAINT "StatusQuarto_quartoId_fkey" FOREIGN KEY ("quartoId") REFERENCES "Quarto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hospede" ADD CONSTRAINT "Hospede_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hospede" ADD CONSTRAINT "Hospede_atualizadoPorId_fkey" FOREIGN KEY ("atualizadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_quartoId_fkey" FOREIGN KEY ("quartoId") REFERENCES "Quarto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_hospedeResponsavelId_fkey" FOREIGN KEY ("hospedeResponsavelId") REFERENCES "Hospede"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_atualizadoPorId_fkey" FOREIGN KEY ("atualizadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_canceladoPorId_fkey" FOREIGN KEY ("canceladoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservaHospede" ADD CONSTRAINT "ReservaHospede_reservaId_fkey" FOREIGN KEY ("reservaId") REFERENCES "Reserva"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservaHospede" ADD CONSTRAINT "ReservaHospede_hospedeId_fkey" FOREIGN KEY ("hospedeId") REFERENCES "Hospede"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Funcionario" ADD CONSTRAINT "Funcionario_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Funcionario" ADD CONSTRAINT "Funcionario_hospedeId_fkey" FOREIGN KEY ("hospedeId") REFERENCES "Hospede"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Manutencao" ADD CONSTRAINT "Manutencao_quartoId_fkey" FOREIGN KEY ("quartoId") REFERENCES "Quarto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Governanca" ADD CONSTRAINT "Governanca_quartoId_fkey" FOREIGN KEY ("quartoId") REFERENCES "Quarto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Financeiro" ADD CONSTRAINT "Financeiro_reservaId_fkey" FOREIGN KEY ("reservaId") REFERENCES "Reserva"("id") ON DELETE SET NULL ON UPDATE CASCADE;
