const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

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
  const status = err.status || 500;
  if (status === 500) console.error(err); // real logging arrives with deployment
  res.status(status).json({ error: {
    // 500s never echo err.code: Node/pg errors carry internal codes like ECONNREFUSED.
    code: status === 500 ? 'INTERNAL' : (err.code || 'ERROR'),
    message: status === 500 ? 'Something went wrong' : err.message,
  } });
}
module.exports = { asyncHandler, httpError, errorHandler };
