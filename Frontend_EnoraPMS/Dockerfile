# --- Etapa 1: Build (Compilação) ---
FROM node:22-alpine AS builder

WORKDIR /app

# Copia os mapeamentos de dependências
COPY package*.json ./

# Instala as dependências necessárias para compilar
RUN npm install

# Copia todo o código fonte para dentro do container
COPY . .

# Executa o "vite build" que gerou com sucesso a pasta dist no log anterior
RUN npm run build

# --- Etapa 2: Produção (Servidor Nginx ultraleve) ---
FROM nginx:alpine

# Remove qualquer arquivo padrão que venha com o Nginx
RUN rm -rf /usr/share/nginx/html/*

# Copia os arquivos gerados pelo Vite (pasta dist) para a pasta pública do Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Cria uma configuração interna para o Nginx rodar na porta 5174 e aceitar rotas do React (SPA)
RUN echo "server { \
    listen 5174; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files \$uri \$uri/ /index.html; \
    } \
}" > /etc/nginx/conf.d/default.conf

# Informa ao Dokploy que a porta interna é a 5174
EXPOSE 5174

# Inicia o servidor web
CMD ["nginx", "-g", "daemon off;"]
