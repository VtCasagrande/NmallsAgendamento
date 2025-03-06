const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { verificarAdmin } = require('./auth');
const { registrarLog } = require('../utils/logger');

// Caminho para o arquivo de configurações local
const configFilePath = path.join(__dirname, '..', 'config.json');

// Função para ler as configurações
function lerConfiguracoes() {
  try {
    if (fs.existsSync(configFilePath)) {
      const configData = fs.readFileSync(configFilePath, 'utf8');
      return JSON.parse(configData);
    }
  } catch (err) {
    console.error('Erro ao ler arquivo de configurações:', err);
  }
  
  // Configurações padrão
  return {
    webhookUrl: process.env.WEBHOOK_URL || '',
    webhookAtivo: true
  };
}

// Função para salvar as configurações
function salvarConfiguracoes(config) {
  try {
    fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Erro ao salvar arquivo de configurações:', err);
    return false;
  }
}

// Middleware para verificar se o usuário é administrador
router.use(verificarAdmin);

// Rota para exibir a página de configurações
router.get('/configuracoes', async (req, res) => {
  try {
    // Obter configurações do arquivo local
    const config = lerConfiguracoes();

    res.render('configuracoes', {
      title: 'Configurações',
      webhookUrl: config.webhookUrl,
      webhookAtivo: config.webhookAtivo,
      mensagem: req.query.mensagem || null,
      tipo: req.query.tipo || 'info',
      dbConnected: res.locals.dbConnected
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', {
      title: 'Erro',
      message: 'Erro ao carregar configurações'
    });
  }
});

// Rota para salvar configurações
router.post('/configuracoes', async (req, res) => {
  try {
    const { webhookUrl, webhookAtivo } = req.body;
    
    // Validar a URL do webhook
    if (webhookUrl && !webhookUrl.startsWith('http')) {
      return res.redirect('/configuracoes?mensagem=URL do webhook inválida. Deve começar com http:// ou https://&tipo=danger');
    }
    
    // Obter configurações atuais
    const configAtual = lerConfiguracoes();
    
    // Atualizar configurações
    const novasConfigs = {
      ...configAtual,
      webhookUrl: webhookUrl || '',
      webhookAtivo: webhookAtivo === 'on'
    };
    
    // Salvar configurações
    const salvou = salvarConfiguracoes(novasConfigs);
    
    if (salvou) {
      // Registrar log de alteração de configuração
      await registrarLog(req, 'alterar_configuracao', {
        webhookUrl: novasConfigs.webhookUrl,
        webhookAtivo: novasConfigs.webhookAtivo
      });
      
      return res.redirect('/configuracoes?mensagem=Configurações salvas com sucesso&tipo=success');
    } else {
      return res.redirect('/configuracoes?mensagem=Erro ao salvar configurações&tipo=danger');
    }
  } catch (err) {
    console.error('Erro ao salvar configurações:', err);
    return res.redirect('/configuracoes?mensagem=Erro ao salvar configurações: ' + err.message + '&tipo=danger');
  }
});

// Rota para testar o webhook
router.post('/api/testar-webhook', async (req, res) => {
  try {
    // Obter configurações do arquivo local
    const config = lerConfiguracoes();
    const webhookUrl = config.webhookUrl;
    const webhookAtivo = config.webhookAtivo;

    if (!webhookUrl) {
      return res.status(400).json({ error: 'URL do webhook não configurada' });
    }

    if (!webhookAtivo) {
      return res.status(400).json({ error: 'Webhook está desativado' });
    }

    // Dados de teste para o webhook
    const dadosTeste = {
      acao: 'teste',
      mensagem: {
        id: 'teste-id',
        nome: 'Usuário de Teste',
        telefone: '(11) 99999-9999',
        mensagem: 'Esta é uma mensagem de teste para o webhook',
        dataAgendamento: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 dia no futuro
        dataCriacao: new Date()
      },
      timestamp: new Date()
    };

    // Enviar o webhook de teste
    const resposta = await axios.post(webhookUrl, dadosTeste);
    console.log('Webhook de teste enviado com sucesso:', resposta.status);

    res.json({ success: true, message: 'Webhook de teste enviado com sucesso' });
  } catch (err) {
    console.error('Erro ao enviar webhook de teste:', err.message);
    res.status(500).json({ error: 'Erro ao enviar webhook de teste: ' + err.message });
  }
});

module.exports = router; 