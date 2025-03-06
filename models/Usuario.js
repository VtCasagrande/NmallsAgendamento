const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const usuarioSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: [true, 'Nome é obrigatório'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email é obrigatório'],
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
      },
      message: props => `${props.value} não é um email válido!`
    }
  },
  senha: {
    type: String,
    required: [true, 'Senha é obrigatória'],
    minlength: [6, 'Senha deve ter pelo menos 6 caracteres']
  },
  role: {
    type: String,
    enum: ['admin', 'operador'],
    default: 'operador'
  },
  dataCriacao: {
    type: Date,
    default: Date.now
  },
  ultimoLogin: {
    type: Date
  },
  criadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario'
  }
});

// Método para verificar senha
usuarioSchema.methods.verificarSenha = async function(senhaInformada) {
  return await bcrypt.compare(senhaInformada, this.senha);
};

// Método para verificar se é admin
usuarioSchema.methods.isAdmin = function() {
  return this.role === 'admin';
};

// Middleware para criptografar a senha antes de salvar
usuarioSchema.pre('save', async function(next) {
  // Só criptografa a senha se ela foi modificada (ou é nova)
  if (!this.isModified('senha')) return next();
  
  try {
    // Gerar um salt
    const salt = await bcrypt.genSalt(10);
    // Criptografar a senha com o salt
    this.senha = await bcrypt.hash(this.senha, salt);
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Usuario', usuarioSchema); 