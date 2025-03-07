const Log = require('../models/Log');
const fs = require('fs');
const path = require('path');

/**
 * Registra uma ação no sistema
 * @param {Object} req - Objeto de requisição do Express
 * @param {String} acao - Tipo de ação (login, logout, criar_mensagem, etc)
 * @param {Object} detalhes - Detalhes adicionais da ação
 * @returns {Promise<Object>} - O log criado
 */
async function registrarLog(req, acao, detalhes = {}) {
  try {
    // Permitir logs sem usuário autenticado
    const usuarioId = req.usuario ? req.usuario.id : null;

    const log = new Log({
      usuario: usuarioId,
      acao,
      detalhes,
      ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress
    });

    await log.save();
    return log;
  } catch (error) {
    console.error('Erro ao registrar log:', error);
    return null;
  }
}

/**
 * Limpa logs mais antigos que o número de dias especificado
 * @param {Number} dias - Número de dias para manter logs (padrão: 7)
 * @returns {Promise<Number>} - Número de logs excluídos
 */
async function limparLogsAntigos(dias = 7) {
  try {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - dias);
    
    console.log(`Limpando logs anteriores a ${dataLimite.toISOString()}`);
    
    const resultado = await Log.deleteMany({ data: { $lt: dataLimite } });
    
    console.log(`${resultado.deletedCount} logs foram excluídos`);
    return resultado.deletedCount;
  } catch (error) {
    console.error('Erro ao limpar logs antigos:', error);
    return 0;
  }
}

/**
 * Limpa todos os logs do sistema
 * @returns {Promise<Number>} - Número de logs excluídos
 */
async function limparTodosLogs() {
  try {
    const resultado = await Log.deleteMany({});
    console.log(`${resultado.deletedCount} logs foram excluídos`);
    return resultado.deletedCount;
  } catch (error) {
    console.error('Erro ao limpar todos os logs:', error);
    return 0;
  }
}

/**
 * Configura a limpeza automática de logs
 * @param {Number} dias - Número de dias para manter logs (padrão: 7)
 * @param {Number} intervaloHoras - Intervalo em horas para verificar logs antigos (padrão: 24)
 */
function configurarLimpezaAutomatica(dias = 7, intervaloHoras = 24) {
  // Converter horas para milissegundos
  const intervalo = intervaloHoras * 60 * 60 * 1000;
  
  console.log(`Configurando limpeza automática de logs a cada ${intervaloHoras} horas, mantendo logs dos últimos ${dias} dias`);
  
  // Executar imediatamente e depois no intervalo configurado
  limparLogsAntigos(dias);
  
  setInterval(() => {
    limparLogsAntigos(dias);
  }, intervalo);
}

module.exports = { 
  registrarLog,
  limparLogsAntigos,
  limparTodosLogs,
  configurarLimpezaAutomatica
}; 