const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Mensagem = require('../models/Mensagem');

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
    const novaMensagem = new Mensagem({
      nome: req.body.nome,
      telefone: req.body.telefone,
      mensagem: req.body.mensagem,
      responsavel: req.body.responsavel,
      dataAgendamento: new Date(req.body.dataAgendamento)
    });

    const mensagemSalva = await novaMensagem.save();
    res.status(201).json(mensagemSalva);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar mensagem' });
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