require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const methodOverride = require('method-override');
const fs = require('fs');
const cookieParser = require('cookie-parser');

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

// Inicializando o app
const app = express();
const PORT = process.env.PORT || 3000;

// Conectando ao MongoDB
let dbConnected = false;
// Adicionar log para depuração
console.log('MONGODB_URI:', process.env.MONGODB_URI);

// Usar uma string de conexão alternativa se a variável de ambiente não estiver definida
const mongoURI = process.env.MONGODB_URI || 'mongodb://admin:senha_admin@mongodb-agendamento:27017/agendamento?authSource=admin';

mongoose.connect(mongoURI, {
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
app.use(cookieParser());

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

// Rota para criar o usuário administrador inicial
app.get('/setup-admin', async (req, res) => {
  try {
    const Usuario = require('./models/Usuario');
    // Verificar se já existe algum usuário
    const usuariosCount = await Usuario.countDocuments();
    
    if (usuariosCount > 0) {
      return res.status(403).json({ 
        error: 'Configuração inicial já foi realizada. Não é possível criar outro administrador por esta rota.' 
      });
    }
    
    // Criar o usuário administrador
    const adminUser = new Usuario({
      nome: 'Administrador',
      email: 'vitor@nmalls.com.br',
      senha: 'admin123',
      role: 'admin'
    });
    
    await adminUser.save();
    
    res.json({ 
      success: true, 
      message: 'Usuário administrador criado com sucesso. Você pode fazer login agora.' 
    });
    
  } catch (error) {
    console.error('Erro ao criar usuário administrador:', error);
    res.status(500).json({ 
      error: 'Ocorreu um erro ao criar o usuário administrador.' 
    });
  }
});

// Rotas protegidas por autenticação
app.use('/', autenticar, mensagensRoutes);
app.use('/api', apiRoutes);
app.use('/', autenticar, configuracoesRoutes);
app.use('/admin', adminRoutes);
app.use('/', chatwootRoutes); // Chatwoot não é protegido para permitir integração

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