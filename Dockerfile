# Etapa 1: Build do React
FROM node:20-alpine AS build

# Atualize os pacotes e instale o FFmpeg
RUN apk update && apk add --no-cache ffmpeg

# Definir o diretório de trabalho
WORKDIR /app

# Copiar os arquivos do dashboard
COPY src/dashboard/package.json src/dashboard/package-lock.json ./src/dashboard/
RUN cd src/dashboard && npm install

# Copiar todos os arquivos do dashboard para o container
COPY src/dashboard ./src/dashboard

# Garantir que o public/index.html seja copiado corretamente
RUN ls -la ./src/dashboard/public

# Fazer o build do React
RUN cd src/dashboard && npm run build

# Etapa 2: Backend com o React buildado
FROM node:20-alpine

# Definir o diretório de trabalho
WORKDIR /app

# Copiar os arquivos do backend
COPY package.json package-lock.json ./
RUN npm install

# Copiar o código do backend
COPY . .

# Copiar o build do React para a pasta correta no backend
COPY --from=build /app/src/dashboard/build ./src/dashboard/build

# Expôr a porta
EXPOSE 3000

# Comando para rodar o backend
CMD ["node", "server.js"]
