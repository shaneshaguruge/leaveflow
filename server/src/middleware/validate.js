// Declarative input checks, run before the handler. Uses VALIDATION_ERROR (not the guide's
// VALIDATION) so every 400 in the API has the one code documented in docs/api.md.
const validate = (rules) => (req, res, next) => {
  const body = req.body || {}; // Express 5 leaves req.body undefined when there is no JSON body
  for (const [field, check, message] of rules) {
    if (!check(body[field], body))
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `${field}: ${message}` } });
  }
  next();
};
const required = (v) => v !== undefined && v !== null && v !== '';
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || '') && !Number.isNaN(Date.parse(v));
const onOrAfter = (other) => (v, body) => !isDate(body[other]) || v >= body[other];
module.exports = { validate, required, isDate, onOrAfter };
