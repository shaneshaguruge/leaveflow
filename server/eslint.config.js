// ESLint flat config for the LeaveFlow API (Node 24, CommonJS).
const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['node_modules/', '.pgdata/', 'coverage/'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      // Express only treats a middleware as an error handler if it declares all four
      // parameters (err, req, res, next), so an unused trailing `next` is intentional.
      'no-unused-vars': ['error', { argsIgnorePattern: '^(_|next$)' }],
    },
  },
  {
    // Jest test files (tests/ is added on another branch).
    files: ['tests/**/*.js', '**/*.test.js'],
    languageOptions: { globals: { ...globals.jest } },
  },
];
