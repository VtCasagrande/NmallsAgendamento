FROM node:18-alpine

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm install --production

# Copiar o restante dos arquivos
COPY . .

# Criar diretórios necessários
RUN mkdir -p data

# Expor a porta
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["node", "index.js"] 