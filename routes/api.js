const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Mensagem = require('../models/Mensagem');
const mongoose = require('mongoose');
const { salvarMensagem, listarMensagens, obterMensagem, atualizarMensagem, excluirMensagem } = require('../controllers/mensagensController');

// Middleware de validação para a API
const validacaoMensagem = [
  body('nome')
    .notEmpty().withMessage('Nome é obrigatório')
    .trim(),
  
  body('telefone')
    .notEmpty().withMessage('Telefone é obrigatório')
    .matches(/^\(\d{2}\)\s\d{4,5}-\d{4}$/).withMessage('Telefone inválido. Use o formato (99) 99999-9999')
    .trim(),
  
  body('mensagem')
    .notEmpty().withMessage('Mensagem é obrigatória')
    .isLength({ max: 500 }).withMessage('Mensagem não pode ter mais de 500 caracteres')
    .trim(),
  
  body('responsavel')
    .notEmpty().withMessage('Responsável é obrigatório')
    .trim(),
  
  body('dataAgendamento')
    .notEmpty().withMessage('Data de agendamento é obrigatória')
    .custom((value) => {
      const dataAgendamento = new Date(value);
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0); // Zerar horas, minutos, segundos e milissegundos
      
      if (dataAgendamento < hoje) {
        throw new Error('A data de agendamento deve ser hoje ou no futuro');
      }
      return true;
    })
];

// Middleware para autenticação específica da API
const autenticarAPI = (req, res, next) => {
  // Verificar se a requisição vem do Chatwoot
  const referer = req.headers.referer || '';
  const isFromChatwoot = referer.includes('chat.nmalls.click') || 
                         req.headers['x-from-chatwoot'] || 
                         req.query.chatwoot_source === 'true';
  
  // Se vier do Chatwoot, permitir acesso sem autenticação
  if (isFromChatwoot) {
    req.isFromChatwoot = true;
    return next();
  }
  
  // Verificar se existe um token no cookie
  const token = req.cookies.token;
  
  if (!token) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  
  try {
    // Verificar o token
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'segredo_temporario');
    req.usuario = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// GET - Listar todas as mensagens
router.get('/mensagens', async (req, res) => {
  try {
    const mensagens = await Mensagem.find().sort({ dataAgendamento: 1 });
    res.json(mensagens);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar mensagens' });
  }
});

// GET - Buscar uma mensagem específica
router.get('/mensagens/:id', async (req, res) => {
  try {
    const mensagem = await Mensagem.findById(req.params.id);
    if (!mensagem) {
      return res.status(404).json({ error: 'Mensagem não encontrada' });
    }
    res.json(mensagem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar mensagem' });
  }
});

// POST - Criar uma nova mensagem
router.post('/mensagens', validacaoMensagem, async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    console.log('API: Recebendo nova mensagem:', req.body);
    
    // Verificar conexão com o MongoDB
    const isConnected = mongoose.connection.readyState === 1;
    console.log('API: Status da conexão MongoDB:', isConnected ? 'Conectado' : 'Desconectado');
    
    // Usar a data exatamente como foi enviada pelo formulário
    console.log('API: Data recebida do formulário (sem modificação):', req.body.dataAgendamento);
    
    // Criar objeto de mensagem
    const novaMensagem = {
      nome: req.body.nome,
      telefone: req.body.telefone,
      mensagem: req.body.mensagem,
      responsavel: req.body.responsavel,
      dataAgendamento: req.body.dataAgendamento, // Manter como string
      criadoPor: null, // Não temos usuário autenticado
      mensagemEnviada: false // Inicialmente não enviada
    };

    console.log('API: Objeto de mensagem criado:', novaMensagem);
    
    // Salvar a mensagem usando o controlador
    const mensagemSalva = await salvarMensagem(novaMensagem);
    
    console.log('API: Mensagem salva com sucesso:', mensagemSalva._id);
    
    res.status(201).json({
      mensagem: 'Mensagem agendada com sucesso',
      id: mensagemSalva._id
    });
  } catch (error) {
    console.error('API: Erro ao salvar mensagem:', error);
    res.status(500).json({ error: 'Erro ao agendar mensagem. Tente novamente.' });
  }
});

// PUT - Atualizar uma mensagem existente
router.put('/mensagens/:id', validacaoMensagem, async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const mensagem = await Mensagem.findById(req.params.id);
    if (!mensagem) {
      return res.status(404).json({ error: 'Mensagem não encontrada' });
    }

    mensagem.nome = req.body.nome;
    mensagem.telefone = req.body.telefone;
    mensagem.mensagem = req.body.mensagem;
    mensagem.responsavel = req.body.responsavel;
    mensagem.dataAgendamento = new Date(req.body.dataAgendamento);

    const mensagemAtualizada = await mensagem.save();
    res.json(mensagemAtualizada);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar mensagem' });
  }
});

// DELETE - Excluir uma mensagem
router.delete('/mensagens/:id', async (req, res) => {
  try {
    const mensagem = await Mensagem.findById(req.params.id);
    if (!mensagem) {
      return res.status(404).json({ error: 'Mensagem não encontrada' });
    }

    await Mensagem.findOneAndDelete({ _id: req.params.id });
    res.json({ message: 'Mensagem excluída com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir mensagem' });
  }
});

// GET - Verificar autenticação
router.get('/auth/check', (req, res) => {
  // Verificar se o usuário está autenticado
  const autenticado = !!req.usuario;
  
  // Retornar o status de autenticação
  res.json({
    autenticado,
    usuario: autenticado ? {
      id: req.usuario.id,
      nome: req.usuario.nome,
      email: req.usuario.email,
      role: req.usuario.role
    } : null
  });
});

// Rota para criar uma nova mensagem (sem autenticação)
router.post('/mensagens', validacaoMensagem, async (req, res) => {
  try {
    // Verificar erros de validação
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Processar a data de agendamento
    const { nome, telefone, mensagem, responsavel, dataAgendamento } = req.body;
    
    // Criar a mensagem
    const novaMensagem = await salvarMensagem({
      nome,
      telefone,
      mensagem,
      responsavel,
      dataAgendamento,
      status: 'agendada',
      criadoEm: new Date()
    });

    console.log(`Nova mensagem agendada para ${nome} em ${dataAgendamento}`);
    
    res.status(201).json({
      mensagem: 'Mensagem agendada com sucesso',
      id: novaMensagem.id
    });
  } catch (error) {
    console.error('Erro ao agendar mensagem:', error);
    res.status(500).json({ error: 'Erro ao agendar mensagem' });
  }
});

// Rota para listar mensagens (sem autenticação)
router.get('/mensagens', async (req, res) => {
  try {
    const mensagens = await listarMensagens();
    res.json(mensagens);
  } catch (error) {
    console.error('Erro ao listar mensagens:', error);
    res.status(500).json({ error: 'Erro ao listar mensagens' });
  }
});

// Rota para obter uma mensagem específica (sem autenticação)
router.get('/mensagens/:id', async (req, res) => {
  try {
    const mensagem = await obterMensagem(req.params.id);
    if (!mensagem) {
      return res.status(404).json({ error: 'Mensagem não encontrada' });
    }
    res.json(mensagem);
  } catch (error) {
    console.error('Erro ao obter mensagem:', error);
    res.status(500).json({ error: 'Erro ao obter mensagem' });
  }
});

// Rota para atualizar uma mensagem (sem autenticação)
router.put('/mensagens/:id', validacaoMensagem, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nome, telefone, mensagem, responsavel, dataAgendamento, status } = req.body;
    
    const mensagemAtualizada = await atualizarMensagem(req.params.id, {
      nome,
      telefone,
      mensagem,
      responsavel,
      dataAgendamento,
      status: status || 'agendada',
      atualizadoEm: new Date()
    });

    if (!mensagemAtualizada) {
      return res.status(404).json({ error: 'Mensagem não encontrada' });
    }

    res.json({
      mensagem: 'Mensagem atualizada com sucesso',
      id: req.params.id
    });
  } catch (error) {
    console.error('Erro ao atualizar mensagem:', error);
    res.status(500).json({ error: 'Erro ao atualizar mensagem' });
  }
});

// Rota para excluir uma mensagem (sem autenticação)
router.delete('/mensagens/:id', async (req, res) => {
  try {
    const resultado = await excluirMensagem(req.params.id);
    
    if (!resultado) {
      return res.status(404).json({ error: 'Mensagem não encontrada' });
    }

    res.json({ mensagem: 'Mensagem excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir mensagem:', error);
    res.status(500).json({ error: 'Erro ao excluir mensagem' });
  }
});

module.exports = router; 