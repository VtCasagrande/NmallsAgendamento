const mongoose = require('mongoose');

const configuracaoSchema = new mongoose.Schema({
  chave: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  valor: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  descricao: {
    type: String,
    trim: true
  },
  dataCriacao: {
    type: Date,
    default: Date.now
  },
  dataAtualizacao: {
    type: Date,
    default: Date.now
  }
});

// Middleware para atualizar a data de atualização
configuracaoSchema.pre('save', function(next) {
  this.dataAtualizacao = new Date();
  next();
});

// Método estático para obter uma configuração por chave
configuracaoSchema.statics.obterPorChave = async function(chave, valorPadrao = null) {
  const configuracao = await this.findOne({ chave });
  return configuracao ? configuracao.valor : valorPadrao;
};

// Método estático para definir uma configuração
configuracaoSchema.statics.definir = async function(chave, valor, descricao = '') {
  const configuracao = await this.findOne({ chave });
  
  if (configuracao) {
    configuracao.valor = valor;
    if (descricao) {
      configuracao.descricao = descricao;
    }
    return await configuracao.save();
  } else {
    return await this.create({
      chave,
      valor,
      descricao
    });
  }
};

module.exports = mongoose.model('Configuracao', configuracaoSchema); 