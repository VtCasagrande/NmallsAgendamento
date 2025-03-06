const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Rota para resetar o sistema e criar um novo usuário administrador
router.get('/reset-system', async (req, res) => {
  try {
    // 1. Limpar todas as coleções do MongoDB
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
      await collections[key].deleteMany({});
      console.log(`Coleção ${key} limpa com sucesso`);
    }
    
    // 2. Criar um novo usuário administrador
    const Usuario = require('../models/Usuario');
    
    // Criar hash da senha
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash('vc632802', salt);
    
    const novoAdmin = new Usuario({
      nome: 'Vitor Casagrande',
      email: 'vitor@nmalls.com.br',
      senha: senhaHash,
      role: 'admin',
      dataCriacao: new Date()
    });
    
    await novoAdmin.save();
    
    // 3. Limpar arquivos de dados locais
    const dataDir = path.join(__dirname, '..', 'data');
    if (fs.existsSync(dataDir)) {
      const files = fs.readdirSync(dataDir);
      for (const file of files) {
        if (file !== '.gitkeep') {
          fs.unlinkSync(path.join(dataDir, file));
          console.log(`Arquivo ${file} removido com sucesso`);
        }
      }
    }
    
    // 4. Resetar configurações
    const configFile = path.join(__dirname, '..', 'config.json');
    const configPadrao = {
      webhookUrl: '',
      webhookAtivo: true
    };
    
    fs.writeFileSync(configFile, JSON.stringify(configPadrao, null, 2), 'utf8');
    
    res.json({
      success: true,
      message: 'Sistema resetado com sucesso. Um novo usuário administrador foi criado.',
      usuario: {
        nome: 'Vitor Casagrande',
        email: 'vitor@nmalls.com.br',
        senha: 'vc632802',
        role: 'admin'
      }
    });
    
  } catch (error) {
    console.error('Erro ao resetar o sistema:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao resetar o sistema: ' + error.message
    });
  }
});

// Rota simples para criar um usuário administrador sem autenticação
router.get('/criar-admin', async (req, res) => {
  try {
    // Criar um novo usuário administrador
    const Usuario = require('../models/Usuario');
    
    // Verificar se o email já está em uso
    const usuarioExistente = await Usuario.findOne({ email: 'vitor@nmalls.com.br' });
    if (usuarioExistente) {
      // Se o usuário já existe, atualizar para administrador
      usuarioExistente.role = 'admin';
      await usuarioExistente.save();
      
      return res.json({
        success: true,
        message: 'Usuário existente atualizado para administrador.',
        usuario: {
          nome: usuarioExistente.nome,
          email: usuarioExistente.email,
          role: 'admin'
        }
      });
    }
    
    // Criar hash da senha
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash('vc632802', salt);
    
    const novoAdmin = new Usuario({
      nome: 'Vitor Casagrande',
      email: 'vitor@nmalls.com.br',
      senha: senhaHash,
      role: 'admin',
      dataCriacao: new Date()
    });
    
    await novoAdmin.save();
    
    res.json({
      success: true,
      message: 'Usuário administrador criado com sucesso.',
      usuario: {
        nome: 'Vitor Casagrande',
        email: 'vitor@nmalls.com.br',
        senha: 'vc632802',
        role: 'admin'
      }
    });
    
  } catch (error) {
    console.error('Erro ao criar usuário administrador:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao criar usuário administrador: ' + error.message
    });
  }
});

module.exports = router; 