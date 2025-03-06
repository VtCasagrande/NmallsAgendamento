$(document).ready(function() {
  // Máscara para o campo de telefone
  $('.telefone').mask('(00) 00000-0000', {
    placeholder: '(99) 99999-9999'
  });

  // Contador de caracteres para o campo de mensagem
  const mensagemTextarea = $('#mensagem');
  const contador = $('#contador');

  // Atualiza o contador ao carregar a página
  if (mensagemTextarea.length) {
    contador.text(mensagemTextarea.val().length);
  }

  // Atualiza o contador ao digitar
  mensagemTextarea.on('input', function() {
    contador.text($(this).val().length);
  });

  // Validação do formulário no lado do cliente
  const form = $('form');
  
  form.on('submit', function(event) {
    let formValido = true;
    
    // Validação do nome
    const nome = $('#nome');
    if (!nome.val().trim()) {
      nome.addClass('is-invalid');
      formValido = false;
    } else {
      nome.removeClass('is-invalid');
    }
    
    // Validação do telefone
    const telefone = $('#telefone');
    const telefoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
    if (!telefone.val().trim() || !telefoneRegex.test(telefone.val())) {
      telefone.addClass('is-invalid');
      formValido = false;
    } else {
      telefone.removeClass('is-invalid');
    }
    
    // Validação da mensagem
    const mensagem = $('#mensagem');
    if (!mensagem.val().trim()) {
      mensagem.addClass('is-invalid');
      formValido = false;
    } else {
      mensagem.removeClass('is-invalid');
    }
    
    // Validação da data de agendamento
    const dataAgendamento = $('#dataAgendamento');
    const dataAgendamentoValue = new Date(dataAgendamento.val());
    const agora = new Date();
    
    if (!dataAgendamento.val() || dataAgendamentoValue <= agora) {
      dataAgendamento.addClass('is-invalid');
      formValido = false;
    } else {
      dataAgendamento.removeClass('is-invalid');
    }
    
    if (!formValido) {
      event.preventDefault();
    }
  });

  // Remover classe is-invalid ao digitar/alterar campos
  $('input, textarea').on('input change', function() {
    $(this).removeClass('is-invalid');
  });
}); 