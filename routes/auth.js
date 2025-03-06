const express = require('express');
const router = express.Router();
const Usuario = require('../models/Usuario');
const jwt = require('jsonwebtoken');

// Middleware para verificar se o usuário está autenticado
const autenticar = (req, res, next) => {
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
};

// Rota para a página de login
router.get('/login', (req, res) => {
  res.render('auth/login', { title: 'Login', error: null });
});

// Rota para a página de registro
router.get('/registro', (req, res) => {
  res.render('auth/registro', { title: 'Registro', error: null });
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
      { id: usuario._id, nome: usuario.nome, email: usuario.email },
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
    console.error('Erro no login:', error);
    res.render('auth/login', { 
      title: 'Login', 
      error: 'Ocorreu um erro ao fazer login. Tente novamente.' 
    });
  }
});

// Rota para processar o registro
router.post('/registro', async (req, res) => {
  try {
    const { nome, email, senha, codigoAutenticador } = req.body;
    
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
      senha
    });
    
    await novoUsuario.save();
    
    // Criar token JWT
    const token = jwt.sign(
      { id: novoUsuario._id, nome: novoUsuario.nome, email: novoUsuario.email },
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
    console.error('Erro no registro:', error);
    res.render('auth/registro', { 
      title: 'Registro', 
      error: 'Ocorreu um erro ao registrar. Tente novamente.' 
    });
  }
});

// Rota para logout
router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
});

module.exports = { router, autenticar }; 