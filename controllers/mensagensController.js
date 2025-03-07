const Mensagem = require('../models/Mensagem');
const fs = require('fs');
const path = require('path');

// Caminho para o arquivo de dados local
const dataFilePath = path.join(__dirname, '..', 'data', 'mensagens.json');

// Função para garantir que o diretório de dados existe
const garantirDiretorio = () => {
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

// Função para ler mensagens do arquivo local
const lerMensagensLocal = () => {
  garantirDiretorio();
  
  if (!fs.existsSync(dataFilePath)) {
    fs.writeFileSync(dataFilePath, JSON.stringify([]));
    return [];
  }
  
  const data = fs.readFileSync(dataFilePath, 'utf8');
  try {
    return JSON.parse(data);
  } catch (error) {
    console.error('Erro ao ler arquivo de mensagens:', error);
    return [];
  }
};

// Função para salvar mensagens no arquivo local
const salvarMensagensLocal = (mensagens) => {
  garantirDiretorio();
  fs.writeFileSync(dataFilePath, JSON.stringify(mensagens, null, 2));
};

// Função para salvar uma nova mensagem
const salvarMensagem = async (mensagemData) => {
  try {
    // Tentar salvar no MongoDB primeiro
    if (global.mongodbConnected) {
      const mensagem = new Mensagem(mensagemData);
      await mensagem.save();
      return mensagem;
    } else {
      // Fallback para armazenamento local
      const mensagens = lerMensagensLocal();
      const novaMensagem = {
        ...mensagemData,
        _id: Date.now().toString(), // ID único baseado no timestamp
        criadoEm: new Date().toISOString()
      };
      
      mensagens.push(novaMensagem);
      salvarMensagensLocal(mensagens);
      
      return novaMensagem;
    }
  } catch (error) {
    console.error('Erro ao salvar mensagem:', error);
    throw error;
  }
};

// Função para listar todas as mensagens
const listarMensagens = async () => {
  try {
    if (global.mongodbConnected) {
      return await Mensagem.find().sort({ criadoEm: -1 });
    } else {
      // Fallback para armazenamento local
      const mensagens = lerMensagensLocal();
      return mensagens.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
    }
  } catch (error) {
    console.error('Erro ao listar mensagens:', error);
    throw error;
  }
};

// Função para obter uma mensagem específica
const obterMensagem = async (id) => {
  try {
    if (global.mongodbConnected) {
      return await Mensagem.findById(id);
    } else {
      // Fallback para armazenamento local
      const mensagens = lerMensagensLocal();
      return mensagens.find(m => m._id === id);
    }
  } catch (error) {
    console.error('Erro ao obter mensagem:', error);
    throw error;
  }
};

// Função para atualizar uma mensagem
const atualizarMensagem = async (id, mensagemData) => {
  try {
    if (global.mongodbConnected) {
      return await Mensagem.findByIdAndUpdate(id, mensagemData, { new: true });
    } else {
      // Fallback para armazenamento local
      const mensagens = lerMensagensLocal();
      const index = mensagens.findIndex(m => m._id === id);
      
      if (index === -1) return null;
      
      mensagens[index] = {
        ...mensagens[index],
        ...mensagemData,
        atualizadoEm: new Date().toISOString()
      };
      
      salvarMensagensLocal(mensagens);
      return mensagens[index];
    }
  } catch (error) {
    console.error('Erro ao atualizar mensagem:', error);
    throw error;
  }
};

// Função para excluir uma mensagem
const excluirMensagem = async (id) => {
  try {
    if (global.mongodbConnected) {
      const resultado = await Mensagem.findByIdAndDelete(id);
      return !!resultado;
    } else {
      // Fallback para armazenamento local
      const mensagens = lerMensagensLocal();
      const index = mensagens.findIndex(m => m._id === id);
      
      if (index === -1) return false;
      
      mensagens.splice(index, 1);
      salvarMensagensLocal(mensagens);
      return true;
    }
  } catch (error) {
    console.error('Erro ao excluir mensagem:', error);
    throw error;
  }
};

module.exports = {
  salvarMensagem,
  listarMensagens,
  obterMensagem,
  atualizarMensagem,
  excluirMensagem
}; 