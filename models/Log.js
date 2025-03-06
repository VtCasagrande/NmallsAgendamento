const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  acao: {
    type: String,
    required: true,
    enum: ['login', 'logout', 'criar_mensagem', 'excluir_mensagem', 'alterar_configuracao', 'criar_usuario', 'alterar_usuario']
  },
  detalhes: {
    type: Object
  },
  ip: {
    type: String
  },
  data: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Log', logSchema); 