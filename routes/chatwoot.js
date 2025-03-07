const express = require('express');
const router = express.Router();

// Rota para a página de login simples do Chatwoot
router.get('/', (req, res) => {
  // Configurar headers para permitir iframe de qualquer origem
  res.header('Content-Security-Policy', "frame-ancestors * 'self'");
  res.header('X-Frame-Options', 'ALLOWALL');
  res.header('Access-Control-Allow-Origin', '*');
  
  // Verificar se já está autenticado com a senha simples
  const senhaCorreta = req.query.senha === '147258';
  
  if (senhaCorreta) {
    // Se a senha estiver correta, mostrar a página de agendamento
    return res.render('chatwoot', { 
      isFromChatwoot: true,
      usuario: { nome: 'Usuário Chatwoot' }
    });
  } else {
    // Se não tiver senha ou senha incorreta, mostrar página de senha simples
    return res.render('senha_simples', {
      erro: req.query.erro || false
    });
  }
});

// Rota para verificar a senha simples
router.post('/', (req, res) => {
  const { senha } = req.body;
  
  // Verificar se a senha está correta
  if (senha === '147258') {
    // Redirecionar para a página com a senha na query
    return res.redirect('/chatwoot?senha=147258');
  } else {
    // Senha incorreta, mostrar erro
    return res.redirect('/chatwoot?erro=true');
  }
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
    allowed_origins: ["*"],
    settings: [],
    views: [
      {
        name: "Agendar Mensagem",
        url: "/chatwoot?senha=147258", // Incluir a senha diretamente na URL
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