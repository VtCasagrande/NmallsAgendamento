const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Mensagem = require('../models/Mensagem');
const mongoose = require('mongoose');

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
      const agora = new Date();
      if (dataAgendamento <= agora) {
        throw new Error('A data de agendamento deve ser no futuro');
      }
      return true;
    })
];

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
    
    // Ajustar a data para o fuso horário do Brasil
    const dataAgendamento = new Date(req.body.dataAgendamento);
    console.log('API: Data recebida (ISO):', req.body.dataAgendamento);
    console.log('API: Data convertida (objeto):', dataAgendamento);
    
    const novaMensagem = new Mensagem({
      nome: req.body.nome,
      telefone: req.body.telefone,
      mensagem: req.body.mensagem,
      responsavel: req.body.responsavel,
      dataAgendamento: dataAgendamento,
      criadoPor: req.usuario ? req.usuario.id : null
    });

    console.log('API: Objeto de mensagem criado:', novaMensagem);
    console.log('API: Data de agendamento final:', novaMensagem.dataAgendamento);
    
    try {
      const mensagemSalva = await novaMensagem.save();
      console.log('API: Mensagem salva com sucesso no MongoDB:', mensagemSalva._id);
      console.log('API: Data salva no MongoDB:', mensagemSalva.dataAgendamento);
      
      // Também salvar localmente para redundância
      const fs = require('fs');
      const path = require('path');
      const { v4: uuidv4 } = require('uuid');
      
      // Caminho para o arquivo de mensagens local
      const mensagensFilePath = path.join(__dirname, '..', 'data', 'mensagens.json');
      
      // Função para ler as mensagens do armazenamento local
      function lerMensagensLocais() {
        try {
          if (fs.existsSync(mensagensFilePath)) {
            const mensagensData = fs.readFileSync(mensagensFilePath, 'utf8');
            return JSON.parse(mensagensData);
          }
        } catch (err) {
          console.error('Erro ao ler arquivo de mensagens:', err);
        }
        return [];
      }
      
      // Função para salvar as mensagens no armazenamento local
      function salvarMensagensLocais(mensagens) {
        try {
          fs.writeFileSync(mensagensFilePath, JSON.stringify(mensagens, null, 2), 'utf8');
          return true;
        } catch (err) {
          console.error('Erro ao salvar arquivo de mensagens:', err);
          return false;
        }
      }
      
      const mensagens = lerMensagensLocais();
      
      const mensagemLocal = {
        _id: mensagemSalva._id.toString(),
        nome: req.body.nome,
        telefone: req.body.telefone,
        mensagem: req.body.mensagem,
        responsavel: req.body.responsavel,
        dataAgendamento: dataAgendamento,
        dataCriacao: new Date(),
        webhookEnviado: false,
        criadoPor: req.usuario ? req.usuario.id : null
      };
      
      mensagens.push(mensagemLocal);
      salvarMensagensLocais(mensagens);
      console.log('API: Mensagem também salva localmente');
      
      res.status(201).json(mensagemSalva);
    } catch (saveError) {
      console.error('API: Erro ao salvar no MongoDB:', saveError);
      
      // Se falhar ao salvar no MongoDB, salvar apenas localmente
      const fs = require('fs');
      const path = require('path');
      const { v4: uuidv4 } = require('uuid');
      
      // Caminho para o arquivo de mensagens local
      const mensagensFilePath = path.join(__dirname, '..', 'data', 'mensagens.json');
      
      // Função para ler as mensagens do armazenamento local
      function lerMensagensLocais() {
        try {
          if (fs.existsSync(mensagensFilePath)) {
            const mensagensData = fs.readFileSync(mensagensFilePath, 'utf8');
            return JSON.parse(mensagensData);
          }
        } catch (err) {
          console.error('Erro ao ler arquivo de mensagens:', err);
        }
        return [];
      }
      
      // Função para salvar as mensagens no armazenamento local
      function salvarMensagensLocais(mensagens) {
        try {
          fs.writeFileSync(mensagensFilePath, JSON.stringify(mensagens, null, 2), 'utf8');
          return true;
        } catch (err) {
          console.error('Erro ao salvar arquivo de mensagens:', err);
          return false;
        }
      }
      
      const mensagens = lerMensagensLocais();
      
      const mensagemLocal = {
        _id: uuidv4(),
        nome: req.body.nome,
        telefone: req.body.telefone,
        mensagem: req.body.mensagem,
        responsavel: req.body.responsavel,
        dataAgendamento: dataAgendamento,
        dataCriacao: new Date(),
        webhookEnviado: false,
        criadoPor: req.usuario ? req.usuario.id : null
      };
      
      mensagens.push(mensagemLocal);
      salvarMensagensLocais(mensagens);
      console.log('API: Mensagem salva apenas localmente devido a erro no MongoDB');
      
      // Enviar webhook manualmente
      const enviarWebhook = require('../utils/webhook');
      await enviarWebhook(mensagemLocal, 'criada');
      
      res.status(201).json({
        _id: mensagemLocal._id,
        ...mensagemLocal,
        _local: true
      });
    }
  } catch (err) {
    console.error('API: Erro geral ao processar mensagem:', err);
    res.status(500).json({ error: 'Erro ao criar mensagem: ' + err.message });
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

module.exports = router; 