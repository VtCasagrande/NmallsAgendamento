const Log = require('../models/Log');

/**
 * Registra uma ação no sistema
 * @param {Object} req - Objeto de requisição do Express
 * @param {String} acao - Tipo de ação (login, logout, criar_mensagem, etc)
 * @param {Object} detalhes - Detalhes adicionais da ação
 * @returns {Promise<Object>} - O log criado
 */
async function registrarLog(req, acao, detalhes = {}) {
  try {
    if (!req.usuario || !req.usuario.id) {
      console.warn('Tentativa de registrar log sem usuário autenticado');
      return null;
    }

    const log = new Log({
      usuario: req.usuario.id,
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

module.exports = { registrarLog }; 