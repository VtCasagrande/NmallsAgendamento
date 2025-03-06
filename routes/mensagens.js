const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Mensagem = require('../models/Mensagem');
const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

// Configurar o moment.js para usar o fuso horário do Brasil
moment.locale('pt-br');
// Definir o fuso horário para o Brasil (GMT-3)
moment.tz.setDefault('America/Sao_Paulo');

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

// Middleware de validação para o formulário de mensagem
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

// Rota para listar todas as mensagens agendadas
router.get('/mensagens', async (req, res) => {
  try {
    let mensagens = [];
    
    if (res.locals.dbConnected) {
      // Se o MongoDB estiver conectado, buscar do banco de dados
      mensagens = await Mensagem.find().sort({ dataAgendamento: 1 });
    } else {
      // Se não, usar o armazenamento local
      mensagens = lerMensagensLocais();
      // Ordenar por data de agendamento
      mensagens.sort((a, b) => new Date(a.dataAgendamento) - new Date(b.dataAgendamento));
    }
    
    res.render('mensagens/index', { 
      title: 'Mensagens Agendadas',
      mensagens,
      moment,
      dbConnected: res.locals.dbConnected
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { 
      title: 'Erro',
      message: 'Erro ao buscar mensagens agendadas: ' + err.message
    });
  }
});

// Rota para exibir o formulário de nova mensagem
router.get('/mensagens/nova', (req, res) => {
  const dataMinima = moment().format('YYYY-MM-DDTHH:mm');
  res.render('mensagens/nova', { 
    title: 'Nova Mensagem',
    mensagem: {},
    errors: [],
    dataMinima,
    dbConnected: res.locals.dbConnected
  });
});

// Rota para criar uma nova mensagem
router.post('/mensagens', validacaoMensagem, async (req, res) => {
  const errors = validationResult(req);
  const dataMinima = moment().format('YYYY-MM-DDTHH:mm');
  
  if (!errors.isEmpty()) {
    return res.render('mensagens/nova', {
      title: 'Nova Mensagem',
      mensagem: req.body,
      errors: errors.array(),
      dataMinima,
      dbConnected: res.locals.dbConnected
    });
  }

  try {
    console.log('Formulário: Recebendo nova mensagem:', req.body);
    
    // Verificar conexão com o MongoDB
    const isConnected = mongoose.connection.readyState === 1;
    console.log('Formulário: Status da conexão MongoDB:', isConnected ? 'Conectado' : 'Desconectado');
    
    // Usar a data exatamente como foi enviada pelo formulário
    console.log('Formulário: Data recebida do formulário:', req.body.dataAgendamento);
    
    // Criar objeto de mensagem com o usuário atual como criador
    const novaMensagem = new Mensagem({
      nome: req.body.nome,
      telefone: req.body.telefone,
      mensagem: req.body.mensagem,
      responsavel: req.body.responsavel,
      dataAgendamento: req.body.dataAgendamento,
      criadoPor: req.usuario ? req.usuario.id : null
    });

    console.log('Formulário: Objeto de mensagem criado:', novaMensagem);

    let mensagemSalvaNoBanco = null;
    
    // Sempre tentar salvar no banco de dados primeiro
    if (isConnected) {
      try {
        mensagemSalvaNoBanco = await novaMensagem.save();
        console.log('Formulário: Mensagem salva com sucesso no MongoDB:', mensagemSalvaNoBanco._id);
        console.log('Formulário: Data salva no MongoDB:', mensagemSalvaNoBanco.dataAgendamento);
      } catch (saveError) {
        console.error('Formulário: Erro ao salvar no MongoDB:', saveError);
      }
    } else {
      console.log('Formulário: MongoDB não está conectado, salvando apenas localmente');
    }
    
    // Também salvar localmente (independente do banco de dados)
    const mensagens = lerMensagensLocais();
    
    const mensagemLocal = {
      _id: mensagemSalvaNoBanco ? mensagemSalvaNoBanco._id.toString() : uuidv4(),
      nome: req.body.nome,
      telefone: req.body.telefone,
      mensagem: req.body.mensagem,
      responsavel: req.body.responsavel,
      dataAgendamento: req.body.dataAgendamento,
      dataCriacao: new Date(),
      webhookEnviado: false,
      criadoPor: req.usuario ? req.usuario.id : null
    };
    
    mensagens.push(mensagemLocal);
    salvarMensagensLocais(mensagens);
    console.log('Formulário: Mensagem salva localmente com ID:', mensagemLocal._id);
    console.log('Formulário: Data salva localmente:', mensagemLocal.dataAgendamento);
    
    // Enviar webhook manualmente se não estiver conectado ao banco
    if (!isConnected) {
      const enviarWebhook = require('../utils/webhook');
      await enviarWebhook(mensagemLocal, 'criada');
      console.log('Formulário: Webhook enviado manualmente');
    }
    
    res.redirect('/mensagens');
  } catch (err) {
    console.error('Formulário: Erro geral ao processar mensagem:', err);
    res.render('mensagens/nova', {
      title: 'Nova Mensagem',
      mensagem: req.body,
      errors: [{ msg: 'Erro ao salvar mensagem: ' + err.message }],
      dataMinima,
      dbConnected: res.locals.dbConnected
    });
  }
});

// Rota para excluir uma mensagem
router.delete('/mensagens/:id', async (req, res) => {
  try {
    let mensagem;
    let podeExcluir = false;
    
    if (res.locals.dbConnected) {
      // Se o MongoDB estiver conectado, buscar a mensagem do banco de dados
      mensagem = await Mensagem.findById(req.params.id);
      
      // Verificar se a mensagem existe
      if (!mensagem) {
        return res.status(404).render('error', { 
          title: 'Erro',
          message: 'Mensagem não encontrada'
        });
      }
      
      // Verificar se o usuário é admin ou o responsável pela mensagem
      if (req.usuario.role === 'admin' || 
          (mensagem.criadoPor && mensagem.criadoPor.toString() === req.usuario.id) || 
          mensagem.responsavel === req.usuario.nome) {
        podeExcluir = true;
        await Mensagem.findOneAndDelete({ _id: req.params.id });
      }
    } else {
      // Se não, buscar do armazenamento local
      const mensagens = lerMensagensLocais();
      const mensagemIndex = mensagens.findIndex(m => m._id === req.params.id);
      
      if (mensagemIndex !== -1) {
        mensagem = mensagens[mensagemIndex];
        
        // Verificar se o usuário é admin ou o responsável pela mensagem
        if (req.usuario.role === 'admin' || 
            (mensagem.criadoPor && mensagem.criadoPor === req.usuario.id) || 
            mensagem.responsavel === req.usuario.nome) {
          podeExcluir = true;
          const mensagemExcluida = mensagens[mensagemIndex];
          mensagens.splice(mensagemIndex, 1);
          salvarMensagensLocais(mensagens);
          
          // Enviar webhook manualmente
          const enviarWebhook = require('../utils/webhook');
          await enviarWebhook(mensagemExcluida, 'excluida');
        }
      } else {
        return res.status(404).render('error', { 
          title: 'Erro',
          message: 'Mensagem não encontrada'
        });
      }
    }
    
    if (!podeExcluir) {
      return res.status(403).render('error', { 
        title: 'Acesso Negado',
        message: 'Você não tem permissão para excluir esta mensagem'
      });
    }
    
    res.redirect('/mensagens');
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { 
      title: 'Erro',
      message: 'Erro ao excluir mensagem: ' + err.message
    });
  }
});

module.exports = router; 