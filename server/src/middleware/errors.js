const { STATUS_CODES } = require('http');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// A 4xx without an app-specific code (e.g. from express.json()) gets its HTTP status name in the
// same UPPER_SNAKE style as every other code: 413 -> PAYLOAD_TOO_LARGE, 415 -> UNSUPPORTED_MEDIA_TYPE.
const statusCode = (status) => (STATUS_CODES[status] || 'Error').toUpperCase().replace(/[^A-Z0-9]+/g, '_');

function httpError(status, code, message) {
  const e = new Error(message);
  e.status = status;
  e.code = code;
  return e;
}

function errorHandler(err, req, res, next) {
  // express.json() rejects malformed bodies with status 400 and type 'entity.parse.failed'.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Request body is not valid JSON' } });
  }
  // express.json() rejects bodies over its 100 kB limit with status 413 and type 'entity.too.large'.
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large (limit 100 kB)' } });
  }
  const status = err.status || 500;
  if (status === 500) console.error(err); // real logging arrives with deployment
  res.status(status).json({ error: {
    // 500s never echo err.code: Node/pg errors carry internal codes like ECONNREFUSED.
    code: status === 500 ? 'INTERNAL' : (err.code || statusCode(status)),
    message: status === 500 ? 'Something went wrong' : err.message,
  } });
}
module.exports = { asyncHandler, httpError, errorHandler };
