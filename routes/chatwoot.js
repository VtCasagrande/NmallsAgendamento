const express = require('express');
const router = express.Router();

// Rota para o dashboard do Chatwoot (sem autenticação)
router.get('/', (req, res) => {
  // Verificar se a requisição vem do Chatwoot
  const isFromChatwoot = req.headers['sec-fetch-dest'] === 'iframe' || 
                         req.headers['referer']?.includes('chat.nmalls.click');
  
  // Configurar headers para permitir iframe
  res.header('Content-Security-Policy', "frame-ancestors 'self' https://chat.nmalls.click");
  res.header('X-Frame-Options', 'ALLOW-FROM https://chat.nmalls.click');
  
  // Renderizar a página sem verificar autenticação
  res.render('chatwoot', { 
    isFromChatwoot: isFromChatwoot,
    usuario: null // Não precisamos mais de usuário autenticado
  });
});

// Rota para o manifesto do Chatwoot
router.get('/manifest.json', (req, res) => {
  const host = req.get('host');
  const protocol = req.protocol;
  const baseUrl = `${protocol}://${host}`;
  
  const manifest = {
    name: "Agendamento de Mensagens",
    description: "Agende mensagens para envio posterior",
    identifier: "agendamento-mensagens",
    host: baseUrl,
    icon: `${baseUrl}/img/icon.png`,
    version: "1.0.0",
    allow_actions: false,
    allowed_origins: ["https://chat.nmalls.click"],
    settings: [],
    views: [
      {
        name: "Agendar Mensagem",
        url: "/chatwoot",
        type: "iframe",
        title: "Agendar Mensagem",
        icon: "calendar",
        iframe_options: {
          width: "100%",
          height: "100%",
          allow: "clipboard-read; clipboard-write"
        }
      }
    ]
  };
  
  res.json(manifest);
});

module.exports = router; 