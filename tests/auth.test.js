// tests/auth.test.js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { signSession, verifySession, hashEmail } from '../netlify/functions/_shared/auth.js';

const SECRET = 'a'.repeat(64);

describe('signSession / verifySession', () => {
  test('round-trip: signed session verifies', () => {
    const cookie = signSession({ u: 'Admin' }, SECRET, 4 * 60 * 60);
    const payload = verifySession(cookie, SECRET);
    assert.equal(payload.u, 'Admin');
    assert.ok(payload.exp > Math.floor(Date.now() / 1000));
  });

  test('tampered payload fails verification', () => {
    const cookie = signSession({ u: 'Admin' }, SECRET, 3600);
    const [payload, sig] = cookie.split('.');
    const tampered = Buffer.from(JSON.stringify({ u: 'Hacker', iat: 0, exp: 9999999999 })).toString('base64url') + '.' + sig;
    assert.equal(verifySession(tampered, SECRET), null);
  });

  test('expired cookie fails verification', () => {
    const cookie = signSession({ u: 'Admin' }, SECRET, -10);
    assert.equal(verifySession(cookie, SECRET), null);
  });

  test('wrong secret fails verification', () => {
    const cookie = signSession({ u: 'Admin' }, SECRET, 3600);
    assert.equal(verifySession(cookie, 'b'.repeat(64)), null);
  });

  test('malformed cookie fails verification gracefully', () => {
    assert.equal(verifySession('notacookie', SECRET), null);
    assert.equal(verifySession('', SECRET), null);
    assert.equal(verifySession(null, SECRET), null);
  });
});

describe('hashEmail', () => {
  test('produces deterministic sha256 hex', () => {
    const h = hashEmail('User@Example.com');
    assert.equal(h, hashEmail('user@example.com'));
    assert.match(h, /^[a-f0-9]{64}$/);
  });
});
