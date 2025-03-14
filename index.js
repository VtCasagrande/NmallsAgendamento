require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const methodOverride = require('method-override');
const fs = require('fs');
const cookieParser = require('cookie-parser');

// Configurar o fuso horário para o Brasil (GMT-3)
process.env.TZ = 'America/Sao_Paulo';
console.log('Fuso horário configurado para:', process.env.TZ);
console.log('Data e hora atual:', new Date().toLocaleString('pt-BR'));

// Verificar se o diretório de dados existe, se não, criar
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Importando rotas
const mensagensRoutes = require('./routes/mensagens');
const apiRoutes = require('./routes/api');
const configuracoesRoutes = require('./routes/configuracoes');
const chatwootRoutes = require('./routes/chatwoot');
const { router: authRoutes, autenticar } = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const resetRoutes = require('./routes/reset');

// Inicializando o app
const app = express();
const PORT = process.env.PORT || 3000;

// Conectar ao MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agendamento')
  .then(() => {
    console.log('Conectado ao MongoDB');
    global.mongodbConnected = true;
  })
  .catch(err => {
    console.error('Erro ao conectar ao MongoDB:', err.message);
    console.log('Continuando com armazenamento local...');
    global.mongodbConnected = false;
  });

// Adicionar evento de conexão para monitorar o estado da conexão
mongoose.connection.on('connected', () => {
  console.log('Mongoose conectado ao MongoDB');
  global.mongodbConnected = true;
});

mongoose.connection.on('error', (err) => {
  console.error('Erro na conexão do Mongoose:', err.message);
  global.mongodbConnected = false;
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose desconectado do MongoDB');
  global.mongodbConnected = false;
});

// Middleware para verificar o status da conexão com o banco de dados
app.use((req, res, next) => {
  res.locals.dbConnected = global.mongodbConnected;
  next();
});

// Configurações do app
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(cookieParser());

// Middleware para formatar data e hora para exibição
app.use((req, res, next) => {
  const moment = require('moment-timezone');
  moment.locale('pt-br');
  moment.tz.setDefault('America/Sao_Paulo');
  res.locals.moment = moment;
  next();
});

// Middleware para CORS
app.use((req, res, next) => {
  // Permitir acesso de qualquer origem
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-From-Chatwoot');
  
  // Configurar cabeçalhos de segurança para permitir iframe de qualquer origem
  res.header('Content-Security-Policy', "frame-ancestors * 'self'");
  res.header('X-Frame-Options', 'ALLOWALL');
  
  // Permitir requisições preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Middleware para disponibilizar informações do usuário para as views
app.use((req, res, next) => {
  const token = req.cookies.token;
  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'segredo_temporario');
      res.locals.usuario = decoded;
    } catch (error) {
      res.locals.usuario = null;
    }
  } else {
    res.locals.usuario = null;
  }
  next();
});

// Rotas de autenticação (não protegidas)
app.use('/', authRoutes);

// Rota de reset do sistema (não protegida)
app.use('/', resetRoutes);

// Rota do Chatwoot (com senha simples, sem autenticação JWT)
app.use('/chatwoot', chatwootRoutes);

// Rota da API (sem autenticação)
app.use('/api', apiRoutes);

// Rotas protegidas por autenticação
app.use('/', autenticar, mensagensRoutes);
app.use('/', autenticar, configuracoesRoutes);
app.use('/admin', adminRoutes);

// Rota para página inicial (redirecionamento)
app.get('/', (req, res) => {
  res.redirect('/mensagens');
});

// Tratamento de erros 404
app.use((req, res) => {
  res.status(404).render('404', { title: 'Página não encontrada' });
});

// Tratamento de erros gerais
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
    title: 'Erro',
    message: 'Ocorreu um erro no servidor: ' + err.message
  });
});

// Configurar limpeza automática de logs (a cada 24 horas, mantendo logs dos últimos 7 dias)
const { configurarLimpezaAutomatica } = require('./utils/logger');
configurarLimpezaAutomatica(7, 24);

// Iniciando o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Acesse http://localhost:${PORT} no seu navegador`);
  console.log(`URL do manifesto do Chatwoot: http://localhost:${PORT}/chatwoot-manifest.json`);
}); 