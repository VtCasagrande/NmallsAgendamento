const mongoose = require('mongoose');
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

const mensagemSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: [true, 'Nome é obrigatório'],
    trim: true
  },
  telefone: {
    type: String,
    required: [true, 'Telefone é obrigatório'],
    trim: true,
    validate: {
      validator: function(v) {
        // Validação básica para telefone brasileiro
        return /^\(\d{2}\)\s\d{4,5}-\d{4}$/.test(v);
      },
      message: props => `${props.value} não é um telefone válido! Use o formato (99) 99999-9999`
    }
  },
  mensagem: {
    type: String,
    required: [true, 'Mensagem é obrigatória'],
    trim: true,
    maxlength: [500, 'Mensagem não pode ter mais de 500 caracteres']
  },
  responsavel: {
    type: String,
    required: [true, 'Responsável é obrigatório'],
    trim: true
  },
  dataAgendamento: {
    type: Date,
    required: [true, 'Data de agendamento é obrigatória']
  },
  dataCriacao: {
    type: Date,
    default: Date.now
  },
  webhookEnviado: {
    type: Boolean,
    default: false
  }
});

// Método para verificar se a data de agendamento é válida (no futuro)
mensagemSchema.methods.isDataAgendamentoValida = function() {
  return this.dataAgendamento > new Date();
};

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
        responsavel: mensagem.responsavel,
        dataAgendamento: mensagem.dataAgendamento,
        dataCriacao: mensagem.dataCriacao
      },
      timestamp: new Date()
    };
    
    // Enviar o webhook
    const resposta = await axios.post(webhookUrl, dados);
    console.log(`Webhook ${acao} enviado com sucesso:`, resposta.status);
    
    // Atualizar o status de envio do webhook
    if (acao !== 'excluida' && mensagem.webhookEnviado !== true) {
      mensagem.webhookEnviado = true;
      await mensagem.save();
    }
    
    return true;
  } catch (erro) {
    console.error(`Erro ao enviar webhook ${acao}:`, erro.message);
    return false;
  }
}

// Middleware para enviar webhook após salvar
mensagemSchema.post('save', async function(doc) {
  const acao = this.isNew ? 'criada' : 'atualizada';
  await enviarWebhook(doc, acao);
});

// Middleware para enviar webhook antes de remover
mensagemSchema.pre('findOneAndDelete', async function() {
  const mensagem = await this.model.findOne(this.getFilter());
  if (mensagem) {
    await enviarWebhook(mensagem, 'excluida');
  }
});

mensagemSchema.pre('deleteOne', { document: true, query: false }, async function() {
  await enviarWebhook(this, 'excluida');
});

module.exports = mongoose.model('Mensagem', mensagemSchema); 