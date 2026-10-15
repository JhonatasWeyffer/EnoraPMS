# --- ESTÁGIO 1: Build ---
FROM node:22-alpine AS builder

WORKDIR /app

# Otimização de cache do Docker: copia apenas declarações de dependências primeiro
COPY package*.json ./
COPY prisma ./prisma/

# Instalação limpa e determinística para ambientes de CI/CD
RUN npm ci

# Variável de ambiente falsa estritamente para o build do Prisma não quebrar
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

# Gera o Prisma Client compatível com a arquitetura do Alpine Linux
RUN npx prisma generate

# Copia o código-fonte restante e compila o NestJS
COPY . .
RUN npm run build

# Remove dependências de desenvolvimento.
# (Com a correção na Etapa 1, o executável 'prisma' sobreviverá a este expurgo).
RUN npm prune --production

# --- ESTÁGIO 2: Runner (Produção) ---
FROM node:22-alpine AS runner

WORKDIR /app

# Cópia estrita: transporta apenas os artefatos vitais do estágio de build
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist/
COPY --from=builder /app/prisma ./prisma

# Porta padrão de escuta do NestJS
EXPOSE 3000

# Sinaliza explicitamente para frameworks e bibliotecas operarem em modo otimizado
ENV NODE_ENV=production

# Executa a migração pendente localmente (rápido e seguro) e inicia a aplicação via Node.
# Altere a última linha para isso:
CMD npx prisma migrate deploy && node dist/src/main.js