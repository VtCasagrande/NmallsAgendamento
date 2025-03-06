require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const methodOverride = require('method-override');
const fs = require('fs');

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

// Inicializando o app
const app = express();
const PORT = process.env.PORT || 3000;

// Conectando ao MongoDB
let dbConnected = false;
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000 // Timeout após 5 segundos
})
.then(() => {
  console.log('Conectado ao MongoDB');
  dbConnected = true;
})
.catch(err => {
  console.error('Erro ao conectar ao MongoDB:', err.message);
  console.log('O aplicativo continuará funcionando com armazenamento local.');
});

// Middleware para verificar o status da conexão com o banco de dados
app.use((req, res, next) => {
  res.locals.dbConnected = dbConnected;
  next();
});

// Configurações do app
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

// Middleware para formatar data e hora para exibição
app.use((req, res, next) => {
  res.locals.moment = require('moment');
  res.locals.moment.locale('pt-br');
  next();
});

// Middleware para CORS (necessário para o Chatwoot)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// Rotas
app.use('/', mensagensRoutes);
app.use('/api', apiRoutes);
app.use('/', configuracoesRoutes);
app.use('/', chatwootRoutes);

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

// Iniciando o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Acesse http://localhost:${PORT} no seu navegador`);
  console.log(`URL do manifesto do Chatwoot: http://localhost:${PORT}/chatwoot-manifest.json`);
}); 