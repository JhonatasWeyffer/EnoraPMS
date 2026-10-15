<div align="center">

# 🏨 EnoraPMS

**Sistema de Gestão Hoteleira — Property Management System**

[![NestJS](https://img.shields.io/badge/Backend-NestJS%2011-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![React](https://img.shields.io/badge/Frontend-React%2019-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/ORM-Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![TailwindCSS](https://img.shields.io/badge/Estilo-TailwindCSS%204-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

</div>

---

## 📋 Índice

- [Sobre o Sistema](#-sobre-o-sistema)
- [Funcionalidades](#-funcionalidades)
- [Arquitetura](#-arquitetura)
- [Stack Tecnológica](#-stack-tecnológica)
- [Requisitos](#-requisitos)
- [Configuração do Ambiente](#-configuração-do-ambiente)
- [Rodando o Projeto](#-rodando-o-projeto)
- [Build para Produção](#-build-para-produção)
- [Deploy com Docker](#-deploy-com-docker)
- [Tutorial de Uso](#-tutorial-de-uso)
- [Estrutura de Pastas](#-estrutura-de-pastas)

---

## 🏨 Sobre o Sistema

O **EnoraPMS** é um sistema completo de gestão hoteleira (Property Management System) desenvolvido para otimizar as operações do dia a dia de hotéis, pousadas e meios de hospedagem.

O sistema integra módulos essenciais como recepção, governança (housekeeping), manutenção, financeiro e relatórios — tudo em uma única plataforma web moderna, responsiva e de fácil utilização.

Além disso, o EnoraPMS possui integração com a **FNRH (Ficha Nacional de Registro de Hóspedes)** via API do Serpro, cumprindo as obrigações legais de registro de hóspedes exigidas pela legislação brasileira.

> **💡 Imagem de destaque — Adicione aqui um banner ou screenshot da tela principal do sistema:**
>
> ![Tela Principal do EnoraPMS](docs/images/banner.png)

---

## ✨ Funcionalidades

| Módulo | Descrição |
|---|---|
| 🗺️ **Mapa de Reservas** | Visualização gráfica da ocupação dos quartos por período |
| 📅 **Reservas** | Criação, edição e gerenciamento completo de reservas |
| 🛎️ **Check-in / Check-out** | Fluxo completo de entrada e saída de hóspedes |
| 👤 **Hóspedes** | Cadastro e histórico de hóspedes com ficha FNRH |
| 🛏️ **Quartos** | Gestão de quartos, categorias, status e tarifas |
| 🧹 **Governança** | Controle de limpeza e status dos apartamentos |
| 🔧 **Manutenção** | Registro e acompanhamento de ordens de manutenção |
| 💰 **Financeiro** | Caixa diário, lançamentos de entrada e saída, formas de pagamento |
| 🏢 **Empresas** | Gestão de clientes corporativos e funcionários hospedados |
| 📊 **Relatórios** | Relatórios gerenciais de ocupação, financeiro e hóspedes |
| 📋 **FNRH** | Ficha Nacional de Registro de Hóspedes integrada ao Serpro |
| ⚙️ **Configurações** | Administração de usuários e parâmetros do sistema |

---

## 🏗️ Arquitetura

O EnoraPMS é dividido em dois projetos independentes que se comunicam via API REST:

```
EnoraPMS/
├── Backend_EnoraPMS/    ← API REST (NestJS + PostgreSQL + Prisma)
└── Frontend_EnoraPMS/   ← Interface Web (React + Vite + TailwindCSS)
```

```mermaid
flowchart LR
    FE["🖥️ Frontend\nReact + Vite\n:5173 (dev)"]
    BE["⚙️ Backend\nNestJS API\n:3000"]
    DB[("🐘 PostgreSQL\nBanco de Dados")]
    SERPRO["🔗 API Serpro\nFNRH"]

    FE -- "REST / Bearer JWT" --> BE
    BE -- "Prisma ORM" --> DB
    BE -- "HTTP" --> SERPRO
```

---

## 🛠️ Stack Tecnológica

### Backend
| Tecnologia | Versão | Finalidade |
|---|---|---|
| **Node.js** | 22+ | Runtime JavaScript |
| **NestJS** | 11 | Framework REST API |
| **TypeScript** | 5.7 | Tipagem estática |
| **Prisma** | 6 | ORM e migrações do banco |
| **PostgreSQL** | 15+ | Banco de dados relacional |
| **JWT + Passport** | — | Autenticação e autorização |
| **Argon2** | — | Hash seguro de senhas |
| **class-validator** | — | Validação de DTOs |

### Frontend
| Tecnologia | Versão | Finalidade |
|---|---|---|
| **React** | 19 | Biblioteca de UI |
| **Vite** | 7 | Build tool e dev server |
| **React Router DOM** | 7 | Roteamento SPA |
| **TailwindCSS** | 4 | Estilização utilitária |
| **Axios** | 1.x | Cliente HTTP |
| **Chart.js** | 4 | Gráficos e relatórios visuais |
| **Lucide React** | — | Ícones modernos |
| **React Hot Toast** | — | Notificações toast |
| **Day.js** | — | Manipulação de datas |

---

## 📦 Requisitos

Certifique-se de ter os seguintes softwares instalados na sua máquina:

| Requisito | Versão Mínima | Download |
|---|---|---|
| **Node.js** | 22+ | [nodejs.org](https://nodejs.org/) |
| **npm** | 10+ | Incluído com Node.js |
| **PostgreSQL** | 15+ | [postgresql.org](https://www.postgresql.org/download/) |
| **Git** | qualquer | [git-scm.com](https://git-scm.com/) |

> **Docker (Opcional):** Para rodar via container, você também precisará do [Docker Desktop](https://www.docker.com/products/docker-desktop/).

---

## ⚙️ Configuração do Ambiente

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/EnoraPMS.git
cd EnoraPMS
```

### 2. Configure o Backend

Navegue até a pasta do backend e crie o arquivo de variáveis de ambiente:

```bash
cd Backend_EnoraPMS
```

Crie um arquivo `.env` na raiz de `Backend_EnoraPMS/` com o seguinte conteúdo:

```env
# URL de Conexão com o Banco de Dados (Formato Prisma)
DATABASE_URL="postgresql://SEU_USUARIO:SUA_SENHA@localhost:5432/ENR-EnoraPMS"

# Configurações de Segurança do Token JWT
JWT_SECRET="insira_uma_chave_criptografica_forte_e_longa_aqui"
JWT_EXPIRES_IN="8h"

# Porta do servidor de desenvolvimento
PORT=3000
```

> ⚠️ **Atenção:** Substitua `SEU_USUARIO` e `SUA_SENHA` pelas credenciais do seu PostgreSQL local.

### 3. Configure o Frontend

Navegue até a pasta do frontend e crie o arquivo de variáveis de ambiente:

```bash
cd ../Frontend_EnoraPMS
```

Crie um arquivo `.env` em `Frontend_EnoraPMS/` com:

```env
# URL base da API do backend
VITE_API_URL=http://localhost:3000
```

---

## 🚀 Rodando o Projeto

### Backend (API NestJS)

```bash
# Entre na pasta do backend
cd Backend_EnoraPMS

# Instale as dependências
npm install

# Execute as migrações do banco de dados
npx prisma migrate deploy

# Gere o cliente Prisma
npx prisma generate

# (Opcional) Popule o banco com dados iniciais
npx prisma db seed

# Inicie o servidor em modo desenvolvimento (com hot-reload)
npm run start:dev
```

A API estará disponível em: **`http://localhost:3000/v2`**

---

### Frontend (React + Vite)

```bash
# Em um novo terminal, entre na pasta do frontend
cd Frontend_EnoraPMS

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

A aplicação estará disponível em: **`http://localhost:5173`**

---

> 💡 **Dica:** Mantenha dois terminais abertos — um rodando o backend e outro o frontend — para desenvolver com ambos em paralelo.

---

## 📦 Build para Produção

### Build do Frontend

```bash
cd Frontend_EnoraPMS

# Gera os arquivos estáticos otimizados em ./dist
npm run build
```

Os arquivos de produção serão gerados na pasta `Frontend_EnoraPMS/dist/`.

Para servir os arquivos de build localmente e testar:

```bash
# Visualização do build com o servidor embutido do Vite
npm run preview

# Ou usando o servidor Express incluído no projeto
npm run start
```

---

### Build do Backend

```bash
cd Backend_EnoraPMS

# Compila o TypeScript para JavaScript em ./dist
npm run build

# Inicia a aplicação compilada em modo produção
npm run start:prod
```

---

## 🐳 Deploy com Docker

O backend possui um `Dockerfile` multi-stage otimizado para produção.

### Build da imagem do Backend

```bash
cd Backend_EnoraPMS

# Constrói a imagem Docker
docker build -t enorapms-backend .

# Executa o container
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://usuario:senha@host:5432/ENR-EnoraPMS" \
  -e JWT_SECRET="sua_chave_secreta" \
  -e JWT_EXPIRES_IN="8h" \
  enorapms-backend
```

> 📌 O container expõe a porta `3000` e executa automaticamente `prisma migrate deploy` antes de iniciar a aplicação.

---

## 📖 Tutorial de Uso

### 1. Login no Sistema

> **📸 Adicione aqui um screenshot da tela de login:**
>
> ![Tela de Login](docs/images/login.png)

Acesse `http://localhost:5173/login` e insira suas credenciais de operador. O sistema utiliza autenticação JWT com sessões de 8 horas.

---

### 2. Dashboard — Visão Geral

> **📸 Adicione aqui um screenshot do Dashboard:**
>
> ![Dashboard](docs/images/dashboard.png)

O Dashboard exibe em tempo real:
- Ocupação atual do hotel
- Entradas e saídas previstas para o dia
- Resumo financeiro do dia
- Lembretes de turno para os operadores

---

### 3. Mapa de Reservas

> **📸 Adicione aqui um screenshot do Mapa de Reservas:**
>
> ![Mapa de Reservas](docs/images/reservation-map.png)

O mapa de reservas é a visão central de ocupação. Exibe todos os quartos do hotel em formato de grid com os hóspedes e períodos de ocupação, permitindo identificar disponibilidade de forma visual e rápida.

---

### 4. Criando uma Reserva

> **📸 Adicione aqui um screenshot do formulário de nova reserva:**
>
> ![Nova Reserva](docs/images/new-reservation.png)

1. Acesse **Reservas** no menu lateral
2. Clique em **Nova Reserva**
3. Selecione o hóspede responsável (ou cadastre um novo)
4. Defina o período de entrada e saída
5. Escolha o quarto disponível
6. Informe a forma de pagamento e valor total
7. Salve a reserva

---

### 5. Check-in de Hóspede

> **📸 Adicione aqui um screenshot da tela de Check-in/Check-out:**
>
> ![Check-in](docs/images/checkin.png)

1. Acesse **Check-in / Check-out** no menu
2. Localize a reserva pelo nome do hóspede ou número da reserva
3. Valide os dados do hóspede e da ficha FNRH
4. Confirme o check-in — o quarto é automaticamente marcado como ocupado

---

### 6. Governança (Housekeeping)

> **📸 Adicione aqui um screenshot da tela de Governança:**
>
> ![Housekeeping](docs/images/housekeeping.png)

Controle o status de limpeza de cada quarto:
- **Pendente:** Aguardando limpeza
- **Em andamento:** Sendo limpo
- **Limpo:** Pronto para receber hóspede

---

### 7. Financeiro — Caixa Diário

> **📸 Adicione aqui um screenshot do módulo Financeiro:**
>
> ![Financeiro](docs/images/financial.png)

Registre entradas e saídas do caixa, vinculadas ou não a reservas. O módulo exibe o saldo acumulado do dia e o histórico de transações por método de pagamento.

---

### 8. Relatórios

> **📸 Adicione aqui um screenshot da tela de Relatórios:**
>
> ![Relatórios](docs/images/reports.png)

Acesse relatórios consolidados de:
- Taxa de ocupação por período
- Receita por categoria de quarto
- Origem das reservas
- Hóspedes mais frequentes

---

## 📁 Estrutura de Pastas

```
EnoraPMS/
│
├── Backend_EnoraPMS/               # API REST — NestJS
│   ├── prisma/
│   │   ├── schema.prisma           # Definição do schema do banco de dados
│   │   ├── migrations/             # Histórico de migrações
│   │   └── seed.ts                 # Script de seed (dados iniciais)
│   ├── src/
│   │   ├── auth/                   # Módulo de autenticação (JWT)
│   │   ├── rooms/                  # Módulo de quartos
│   │   ├── reservations/           # Módulo de reservas
│   │   ├── guests/                 # Módulo de hóspedes
│   │   ├── check/                  # Módulo de check-in/check-out
│   │   ├── financial/              # Módulo financeiro
│   │   ├── housekeeping/           # Módulo de governança
│   │   ├── maintenance/            # Módulo de manutenção
│   │   ├── dashboard/              # Módulo do dashboard
│   │   ├── reports/                # Módulo de relatórios
│   │   ├── companies/              # Módulo corporativo
│   │   ├── prisma/                 # Serviço Prisma compartilhado
│   │   ├── app.module.ts           # Módulo raiz da aplicação
│   │   └── main.ts                 # Entry point do servidor
│   ├── Dockerfile                  # Container para produção
│   └── .env                        # Variáveis de ambiente (não versionar!)
│
└── Frontend_EnoraPMS/              # Interface Web — React + Vite
    ├── public/
    │   ├── img/                    # Imagens públicas
    │   └── sounds/                 # Sons do sistema
    ├── src/
    │   ├── components/             # Componentes reutilizáveis (Header, Sidebar, Modal...)
    │   ├── layouts/                # Layout padrão autenticado
    │   ├── modules/                # Módulos funcionais complexos (ex: reports)
    │   ├── pages/                  # Páginas da aplicação
    │   │   ├── Dashboard.jsx
    │   │   ├── ReservationMap.jsx
    │   │   ├── Reservations.jsx
    │   │   ├── CheckinCheckout.jsx
    │   │   ├── Guests.jsx
    │   │   ├── Rooms.jsx
    │   │   ├── Financial.jsx
    │   │   ├── Housekeeping.jsx
    │   │   ├── Maintenance.jsx
    │   │   ├── Reports.jsx
    │   │   ├── Company.jsx
    │   │   ├── FNRH.jsx
    │   │   └── Login.jsx
    │   ├── routes/                 # Configuração de rotas e proteção
    │   ├── services/               # Configuração do Axios (api.js)
    │   ├── styles/                 # CSS por módulo
    │   └── utils/                  # Utilitários e formatadores
    ├── vite.config.js              # Configuração do Vite
    └── .env                        # Variáveis de ambiente do frontend (não versionar!)
```

---

<div align="center">

Desenvolvido com ❤️ para a hotelaria brasileira.

</div>
