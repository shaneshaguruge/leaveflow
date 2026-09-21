const request = require('supertest');
const app = require('../src/app');

describe('error envelope for requests the body parser rejects', () => {
  test('a body over 100 kB gets 413 PAYLOAD_TOO_LARGE in the standard shape', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ email: 'a'.repeat(150 * 1024), password: 'x' }));
    expect(res.status).toBe(413);
    expect(res.body).toEqual({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large (limit 100 kB)' } });
  });

  test('malformed JSON still gets 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": "x",');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
