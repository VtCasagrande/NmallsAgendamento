const express = require('express');
const router = express.Router();

// Rota para o Chatwoot Dashboard App
router.get('/chatwoot', (req, res) => {
  res.render('chatwoot');
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
        url: `${baseUrl}/chatwoot`,
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