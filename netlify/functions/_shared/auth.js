// netlify/functions/_shared/auth.js
import crypto from 'node:crypto';

/**
 * Sign a session payload into a cookie string: base64url(payload).hex(hmac).
 * @param {object} data — payload to include (e.g., { u: 'Admin' })
 * @param {string} secret — HMAC key
 * @param {number} ttlSeconds — lifetime in seconds (negative for already-expired in tests)
 * @returns {string}
 */
export function signSession(data, secret, ttlSeconds) {
  const now = Math.floor(Date.now() / 1000);
  const payload = { ...data, iat: now, exp: now + ttlSeconds };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payloadB64).digest('hex');
  return `${payloadB64}.${sig}`;
}

/**
 * Verify a cookie. Returns the payload if valid + unexpired, otherwise null.
 * Constant-time comparison; gracefully handles malformed input.
 */
export function verifySession(cookie, secret) {
  if (!cookie || typeof cookie !== 'string') return null;
  const parts = cookie.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;

  const expected = crypto.createHmac('sha256', secret).update(payloadB64).digest('hex');
  let valid;
  try {
    valid = crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return null;
  }
  if (!valid) return null;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }
  return payload;
}

/**
 * Hash an email for use as an index key. Case-insensitive.
 */
export function hashEmail(email) {
  return crypto.createHash('sha256').update(String(email).toLowerCase().trim()).digest('hex');
}

/**
 * Constant-time string comparison for password verification.
 */
export function timingSafeStringEqual(a, b) {
  const aBuf = Buffer.from(String(a));
  const bBuf = Buffer.from(String(b));
  if (aBuf.length !== bBuf.length) {
    const max = Math.max(aBuf.length, bBuf.length);
    crypto.timingSafeEqual(Buffer.alloc(max, 0), Buffer.alloc(max, 0));
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}
