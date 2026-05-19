// netlify/functions/_shared/ratelimit.js
import crypto from 'node:crypto';
import { rateLimitStore } from './blobs.js';

const WINDOW_MS = 5 * 60 * 1000;     // 5 min observation window
const MAX_ATTEMPTS = 5;
const BLOCK_MS = 10 * 60 * 1000;     // 10 min block

function ipHash(ip) {
  return crypto.createHash('sha256').update(String(ip || 'unknown')).digest('hex').slice(0, 32);
}

/**
 * Returns { ok: true } if request is allowed, or { ok: false, retryAfter } if blocked.
 * Call recordFailure() after a failed login attempt.
 */
export async function checkRateLimit(ip) {
  const store = rateLimitStore();
  const key = ipHash(ip);
  const now = Date.now();
  const rec = (await store.get(key, { type: 'json' })) || null;

  if (!rec) return { ok: true };

  if (rec.blockedUntil && rec.blockedUntil > now) {
    return { ok: false, retryAfter: Math.ceil((rec.blockedUntil - now) / 1000) };
  }

  // Window expired? Reset
  if (now - rec.firstAttemptAt > WINDOW_MS) {
    await store.delete(key);
    return { ok: true };
  }
  return { ok: true };
}

export async function recordFailure(ip) {
  const store = rateLimitStore();
  const key = ipHash(ip);
  const now = Date.now();
  const rec = (await store.get(key, { type: 'json' })) || { count: 0, firstAttemptAt: now };

  if (now - rec.firstAttemptAt > WINDOW_MS) {
    rec.count = 1; rec.firstAttemptAt = now; rec.blockedUntil = null;
  } else {
    rec.count++;
    if (rec.count >= MAX_ATTEMPTS) rec.blockedUntil = now + BLOCK_MS;
  }
  await store.setJSON(key, rec);
}

export async function clearRateLimit(ip) {
  await rateLimitStore().delete(ipHash(ip));
}
