const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: false
  },
  acao: {
    type: String,
    required: true,
    enum: [
      'login', 
      'logout', 
      'criar_mensagem', 
      'excluir_mensagem', 
      'marcar_mensagem_enviada', 
      'alterar_configuracao', 
      'criar_usuario', 
      'alterar_usuario',
      'acessar_chatwoot',
      'agendar_mensagem_chatwoot',
      'limpar_logs'
    ]
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