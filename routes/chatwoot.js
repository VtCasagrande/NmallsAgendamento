const express = require('express');
const router = express.Router();
const { registrarLog } = require('../utils/logger');
const jwt = require('jsonwebtoken');

// Middleware para autenticação específica do Chatwoot
const autenticarChatwoot = (req, res, next) => {
  // Verificar se a requisição vem do Chatwoot
  const referer = req.headers.referer || '';
  const isFromChatwoot = referer.includes('chat.nmalls.click') || 
                         req.headers['x-from-chatwoot'] || 
                         req.query.chatwoot_source === 'true';
  
  // Se vier do Chatwoot, permitir acesso sem autenticação
  if (isFromChatwoot) {
    req.isFromChatwoot = true;
    return next();
  }
  
  // Verificar se existe um token no cookie
  const token = req.cookies.token;
  
  if (!token) {
    return res.redirect('/login?redirect=/chatwoot');
  }
  
  try {
    // Verificar o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'segredo_temporario');
    req.usuario = decoded;
    res.locals.usuario = decoded; // Disponibilizar o usuário para as views
    next();
  } catch (error) {
    res.clearCookie('token');
    return res.redirect('/login?redirect=/chatwoot');
  }
};

// Rota para o Chatwoot Dashboard App - Com autenticação específica
router.get('/chatwoot', autenticarChatwoot, (req, res) => {
  // Se o usuário estiver autenticado, registrar o log
  if (req.usuario) {
    registrarLog(req, 'acessar_chatwoot', { 
      usuario: req.usuario.nome,
      role: req.usuario.role,
      referer: req.headers.referer || ''
    });
  } else if (req.isFromChatwoot) {
    console.log('Acesso ao Chatwoot via iframe sem autenticação');
  }
  
  // Renderizar a página com informação sobre a origem
  res.render('chatwoot', { 
    isFromChatwoot: req.isFromChatwoot || false,
    usuario: req.usuario || null
  });
});

// Rota para o manifesto do Chatwoot Dashboard App
router.get('/chatwoot-manifest.json', (req, res) => {
  // Obter a URL base da aplicação
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  const baseUrl = `${protocol}://${host}`;
  
  // Definir o manifesto
  const manifest = {
    name: "Agendamento de Mensagens",
    description: "Agende mensagens para enviar aos seus contatos em uma data e hora específicas.",
    icon: `${baseUrl}/img/calendar-icon.svg`,
    views: {
      dashboard_app: {
        url: `${baseUrl}/chatwoot?chatwoot_source=true`,
        title: "Agendar Mensagem",
        icon: "calendar",
        type: "iframe",
        iframe_options: {
          width: "100%",
          height: "100%"
        }
      }
    }
  };
  
  res.json(manifest);
});

module.exports = router; 