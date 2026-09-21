// Structured request logging (Phase 10): one JSON object per line on stdout, which is what
// CloudWatch Logs / Render's log viewer store and filter on (e.g. { $.res.statusCode = 401 }).
const pino = require('pino');
const pinoHttp = require('pino-http');
const crypto = require('crypto');

// Jest/Supertest runs with NODE_ENV=test: keep test output clean.
const level = process.env.NODE_ENV === 'test' ? 'silent' : (process.env.LOG_LEVEL || 'info');
const logger = pino({ level });

// Reuse a caller's X-Request-Id (a proxy or the client) so one id follows the request across
// systems; otherwise make one. Only short, plain ids are trusted — anything else is replaced.
const SAFE_ID = /^[A-Za-z0-9._:-]{1,128}$/;
function genReqId(req, res) {
  const incoming = req.headers['x-request-id'];
  const id = typeof incoming === 'string' && SAFE_ID.test(incoming) ? incoming : crypto.randomUUID();
  res.setHeader('X-Request-Id', id);
  return id;
}

const httpLogger = pinoHttp({
  logger,
  genReqId,
  // Logs are stored and shared: bearer tokens and cookies must never land in them.
  redact: ['req.headers.authorization', 'req.headers.cookie'],
});

module.exports = { logger, httpLogger };
