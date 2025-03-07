const express = require('express');
const router = express.Router();
const { registrarLog } = require('../utils/logger');

// Rota para o Chatwoot Dashboard App - Sem autenticação obrigatória
router.get('/chatwoot', (req, res) => {
  // Verificar se a requisição vem do Chatwoot (através do referer ou outros headers)
  const referer = req.headers.referer || '';
  const isFromChatwoot = referer.includes('chat.nmalls.click') || 
                         req.headers['x-from-chatwoot'] || 
                         req.query.chatwoot_source === 'true';
  
  // Se o usuário estiver autenticado, registrar o log
  if (req.usuario) {
    registrarLog(req, 'acessar_chatwoot', { 
      usuario: req.usuario.nome,
      role: req.usuario.role,
      referer: referer
    });
  }
  
  // Renderizar a página com informação sobre a origem
  res.render('chatwoot', { 
    isFromChatwoot: isFromChatwoot 
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