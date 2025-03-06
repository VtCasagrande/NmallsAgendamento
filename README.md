# Agendamento de Mensagens

Sistema de agendamento de mensagens com integração ao Chatwoot.

## Funcionalidades

- Agendamento de mensagens para envio em data e hora específicas
- Integração com Chatwoot como Dashboard App
- Funcionamento offline (sem MongoDB) com armazenamento local
- Envio de webhooks para notificação de eventos

## Requisitos

- Node.js 14+
- MongoDB (opcional)

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/agendamento
```

## Instalação Local

```bash
# Instalar dependências
npm install

# Iniciar o servidor
npm start
```

## Implantação no EasyPanel

1. Faça login no seu servidor EasyPanel
2. Clique em "Criar Aplicativo"
3. Selecione "Aplicativo Personalizado" ou "Docker"
4. Configure as seguintes opções:
   - Nome: Agendamento de Mensagens
   - Imagem: Selecione "Construir a partir do Dockerfile"
   - Porta: 3000
   - Variáveis de ambiente:
     - PORT=3000
     - MONGODB_URI=mongodb://seu-servidor-mongodb:27017/agendamento
   - Volumes:
     - /data:/app/data
     - /config.json:/app/config.json

5. Clique em "Criar"

## Integração com Chatwoot

1. Acesse o painel de administração do Chatwoot
2. Vá para Configurações > Aplicativos
3. Clique em "Adicionar novo aplicativo"
4. Selecione "Dashboard App"
5. No campo URL do manifesto, insira:
   ```
   https://seu-dominio.com/chatwoot-manifest.json
   ```
6. Clique em "Adicionar"
7. Ative o aplicativo

## Licença

MIT 