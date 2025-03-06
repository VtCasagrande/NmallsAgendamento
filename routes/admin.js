const express = require('express');
const router = express.Router();
const Usuario = require('../models/Usuario');
const Log = require('../models/Log');
const { autenticar, verificarAdmin } = require('./auth');
const { registrarLog } = require('../utils/logger');

// Middleware para todas as rotas de admin
router.use(autenticar, verificarAdmin);

// Rota para listar usuários
router.get('/usuarios', async (req, res) => {
  try {
    const usuarios = await Usuario.find().sort({ dataCriacao: -1 });
    
    res.render('admin/usuarios', {
      title: 'Gerenciar Usuários',
      usuarios,
      currentUser: req.usuario
    });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).render('error', {
      title: 'Erro',
      message: 'Erro ao listar usuários: ' + error.message
    });
  }
});

// Rota para editar usuário (formulário)
router.get('/usuarios/:id/editar', async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id);
    
    if (!usuario) {
      return res.status(404).render('error', {
        title: 'Erro',
        message: 'Usuário não encontrado'
      });
    }
    
    res.render('admin/editar-usuario', {
      title: 'Editar Usuário',
      usuario,
      error: null
    });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).render('error', {
      title: 'Erro',
      message: 'Erro ao buscar usuário: ' + error.message
    });
  }
});

// Rota para atualizar usuário
router.post('/usuarios/:id', async (req, res) => {
  try {
    const { nome, email, role, senha } = req.body;
    const usuario = await Usuario.findById(req.params.id);
    
    if (!usuario) {
      return res.status(404).render('error', {
        title: 'Erro',
        message: 'Usuário não encontrado'
      });
    }
    
    // Atualizar dados
    usuario.nome = nome;
    usuario.role = role;
    
    // Se o email for alterado, verificar se já existe
    if (email !== usuario.email) {
      const emailExistente = await Usuario.findOne({ email, _id: { $ne: usuario._id } });
      if (emailExistente) {
        return res.render('admin/editar-usuario', {
          title: 'Editar Usuário',
          usuario,
          error: 'Este email já está em uso por outro usuário'
        });
      }
      usuario.email = email;
    }
    
    // Se a senha for fornecida, atualizar
    if (senha && senha.trim() !== '') {
      if (senha.length < 6) {
        return res.render('admin/editar-usuario', {
          title: 'Editar Usuário',
          usuario,
          error: 'A senha deve ter pelo menos 6 caracteres'
        });
      }
      usuario.senha = senha;
    }
    
    await usuario.save();
    
    // Registrar log
    await registrarLog(req, 'alterar_usuario', {
      usuarioAlterado: usuario._id,
      nome: usuario.nome,
      email: usuario.email,
      role: usuario.role
    });
    
    res.redirect('/admin/usuarios');
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).render('error', {
      title: 'Erro',
      message: 'Erro ao atualizar usuário: ' + error.message
    });
  }
});

// Rota para excluir usuário
router.delete('/usuarios/:id', async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id);
    
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    // Não permitir excluir o próprio usuário
    if (usuario._id.toString() === req.usuario.id) {
      return res.status(400).json({ error: 'Você não pode excluir seu próprio usuário' });
    }
    
    // Registrar log antes de excluir
    await registrarLog(req, 'excluir_usuario', {
      usuarioExcluido: usuario._id,
      nome: usuario.nome,
      email: usuario.email
    });
    
    await Usuario.findByIdAndDelete(req.params.id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    res.status(500).json({ error: 'Erro ao excluir usuário: ' + error.message });
  }
});

// Rota para visualizar logs
router.get('/logs', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const skip = (page - 1) * limit;
    
    const logs = await Log.find()
      .populate('usuario', 'nome email')
      .sort({ data: -1 })
      .skip(skip)
      .limit(limit);
    
    const totalLogs = await Log.countDocuments();
    const totalPages = Math.ceil(totalLogs / limit);
    
    res.render('admin/logs', {
      title: 'Logs do Sistema',
      logs,
      currentPage: page,
      totalPages,
      totalLogs
    });
  } catch (error) {
    console.error('Erro ao buscar logs:', error);
    res.status(500).render('error', {
      title: 'Erro',
      message: 'Erro ao buscar logs: ' + error.message
    });
  }
});

module.exports = router; 