const axios = require('axios');
const fs = require('fs');
const path = require('path');

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

// Função para enviar webhook
async function enviarWebhook(mensagem, acao) {
  try {
    // Ler configurações do arquivo
    const config = lerConfiguracoes();
    
    // Verificar se o webhook está ativo
    if (!config.webhookAtivo) {
      console.log('Webhook está desativado. Não será enviado.');
      return false;
    }

    // Obter a URL do webhook das configurações
    const webhookUrl = config.webhookUrl || process.env.WEBHOOK_URL;
    if (!webhookUrl) {
      console.log('URL do webhook não configurada. Não será enviado.');
      return false;
    }
    
    // Dados a serem enviados
    const dados = {
      acao: acao, // 'criada', 'atualizada' ou 'excluida'
      mensagem: {
        id: mensagem._id,
        nome: mensagem.nome,
        telefone: mensagem.telefone,
        mensagem: mensagem.mensagem,
        dataAgendamento: mensagem.dataAgendamento,
        dataCriacao: mensagem.dataCriacao
      },
      timestamp: new Date()
    };
    
    // Enviar o webhook
    const resposta = await axios.post(webhookUrl, dados);
    console.log(`Webhook ${acao} enviado com sucesso:`, resposta.status);
    return true;
  } catch (erro) {
    console.error(`Erro ao enviar webhook ${acao}:`, erro.message);
    return false;
  }
}

module.exports = enviarWebhook; 