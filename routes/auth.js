const express = require('express');
const router = express.Router();
const Usuario = require('../models/Usuario');
const jwt = require('jsonwebtoken');
const { registrarLog } = require('../utils/logger');

// Middleware para verificar se o usuário está autenticado
const autenticar = (req, res, next) => {
  // TEMPORÁRIO: Permitir acesso sem autenticação
  // Criar um usuário fictício para permitir acesso
  req.usuario = {
    id: '000000000000000000000000',
    nome: 'Usuário Temporário',
    email: 'temp@example.com',
    role: 'admin'
  };
  
  // Disponibilizar o usuário para as views
  res.locals.usuario = req.usuario;
  
  // Continuar para a próxima middleware
  next();
  
  /* CÓDIGO ORIGINAL - COMENTADO TEMPORARIAMENTE
  // Verificar se existe um token no cookie
  const token = req.cookies.token;
  
  if (!token) {
    return res.redirect('/login');
  }
  
  try {
    // Verificar o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'segredo_temporario');
    req.usuario = decoded;
    next();
  } catch (error) {
    res.clearCookie('token');
    return res.redirect('/login');
  }
  */
};

// Middleware para verificar se o usuário é administrador
const verificarAdmin = (req, res, next) => {
  // TEMPORÁRIO: Permitir acesso de administrador para todos
  next();
  
  /* CÓDIGO ORIGINAL - COMENTADO TEMPORARIAMENTE
  if (!req.usuario || req.usuario.role !== 'admin') {
    return res.status(403).render('error', { 
      title: 'Acesso Negado',
      message: 'Você não tem permissão para acessar esta página.'
    });
  }
  next();
  */
};

// Rota para a página de login
router.get('/login', (req, res) => {
  res.render('auth/login', { title: 'Login', error: null });
});

// Rota para a página de registro
router.get('/registro', autenticar, verificarAdmin, (req, res) => {
  res.render('auth/registro', { title: 'Registro', error: null });
});

// Rota alternativa para registro de administrador (para recuperação)
router.get('/admin-registro', (req, res) => {
  res.render('auth/registro', { 
    title: 'Registro de Administrador', 
    error: null,
    isAdminRegistro: true
  });
});

// Rota para processar o login
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    
    // Buscar o usuário pelo email
    const usuario = await Usuario.findOne({ email });
    
    // Verificar se o usuário existe
    if (!usuario) {
      return res.render('auth/login', { 
        title: 'Login', 
        error: 'Email ou senha inválidos' 
      });
    }
    
    // Verificar a senha
    const senhaCorreta = await usuario.verificarSenha(senha);
    if (!senhaCorreta) {
      return res.render('auth/login', { 
        title: 'Login', 
        error: 'Email ou senha inválidos' 
      });
    }
    
    // Atualizar a data do último login
    usuario.ultimoLogin = new Date();
    await usuario.save();
    
    // Criar token JWT
    const token = jwt.sign(
      { 
        id: usuario._id, 
        nome: usuario.nome, 
        email: usuario.email,
        role: usuario.role
      },
      process.env.JWT_SECRET || 'segredo_temporario',
      { expiresIn: '1d' }
    );
    
    // Salvar token em cookie
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 1 dia
    });
    
    // Registrar log de login
    req.usuario = { id: usuario._id };
    await registrarLog(req, 'login');
    
    // Redirecionar para a página principal
    res.redirect('/mensagens');
    
  } catch (error) {
    console.error('Erro no login:', error);
    res.render('auth/login', { 
      title: 'Login', 
      error: 'Ocorreu um erro ao fazer login. Tente novamente.' 
    });
  }
});

// Rota para processar o registro
router.post('/registro', autenticar, verificarAdmin, async (req, res) => {
  try {
    const { nome, email, senha, codigoAutenticador, role } = req.body;
    
    // Verificar o código de autenticador
    if (codigoAutenticador !== '6328') {
      return res.render('auth/registro', { 
        title: 'Registro', 
        error: 'Código de autenticador inválido' 
      });
    }
    
    // Verificar se o email já está em uso
    const usuarioExistente = await Usuario.findOne({ email });
    if (usuarioExistente) {
      return res.render('auth/registro', { 
        title: 'Registro', 
        error: 'Este email já está em uso' 
      });
    }
    
    // Criar novo usuário
    const novoUsuario = new Usuario({
      nome,
      email,
      senha,
      role: role || 'operador',
      criadoPor: req.usuario.id
    });
    
    await novoUsuario.save();
    
    // Registrar log de criação de usuário
    await registrarLog(req, 'criar_usuario', { 
      usuarioCriado: novoUsuario._id,
      nome: novoUsuario.nome,
      email: novoUsuario.email,
      role: novoUsuario.role
    });
    
    // Redirecionar para a página de usuários
    res.redirect('/admin/usuarios');
    
  } catch (error) {
    console.error('Erro no registro:', error);
    res.render('auth/registro', { 
      title: 'Registro', 
      error: 'Ocorreu um erro ao registrar. Tente novamente.' 
    });
  }
});

// Rota para processar o registro de administrador (para recuperação)
router.post('/admin-registro', async (req, res) => {
  try {
    const { nome, email, senha, codigoAutenticador } = req.body;
    
    // Verificar o código de autenticador especial para recuperação
    if (codigoAutenticador !== 'vc632802') {
      return res.render('auth/registro', { 
        title: 'Registro de Administrador', 
        error: 'Código de recuperação inválido',
        isAdminRegistro: true
      });
    }
    
    // Verificar se o email já está em uso
    const usuarioExistente = await Usuario.findOne({ email });
    if (usuarioExistente) {
      return res.render('auth/registro', { 
        title: 'Registro de Administrador', 
        error: 'Este email já está em uso',
        isAdminRegistro: true
      });
    }
    
    // Criar novo usuário administrador
    const novoUsuario = new Usuario({
      nome,
      email,
      senha,
      role: 'admin',
      dataCriacao: new Date()
    });
    
    await novoUsuario.save();
    
    // Criar token JWT
    const token = jwt.sign(
      { 
        id: novoUsuario._id, 
        nome: novoUsuario.nome, 
        email: novoUsuario.email,
        role: novoUsuario.role
      },
      process.env.JWT_SECRET || 'segredo_temporario',
      { expiresIn: '1d' }
    );
    
    // Salvar token em cookie
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 1 dia
    });
    
    // Redirecionar para a página principal
    res.redirect('/mensagens');
    
  } catch (error) {
    console.error('Erro no registro de administrador:', error);
    res.render('auth/registro', { 
      title: 'Registro de Administrador', 
      error: 'Ocorreu um erro ao registrar. Tente novamente.',
      isAdminRegistro: true
    });
  }
});

// Rota para logout
router.get('/logout', async (req, res) => {
  // Registrar log de logout
  if (req.usuario) {
    await registrarLog(req, 'logout');
  }
  
  res.clearCookie('token');
  res.redirect('/login');
});

// Rota para criar o usuário administrador inicial
router.get('/setup-admin', async (req, res) => {
  try {
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

module.exports = { router, autenticar, verificarAdmin }; 