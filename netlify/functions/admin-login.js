// netlify/functions/admin-login.js
import { signSession, timingSafeStringEqual } from './_shared/auth.js';
import { checkRateLimit, recordFailure, clearRateLimit } from './_shared/ratelimit.js';

const SESSION_TTL = 4 * 60 * 60; // 4h

function clientIp(req) {
  return req.headers.get('x-nf-client-connection-ip')
      || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || 'unknown';
}

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const ip = clientIp(req);
  const limit = await checkRateLimit(ip);
  if (!limit.ok) {
    return new Response(JSON.stringify({ error: 'rate_limited' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(limit.retryAfter) },
    });
  }

  let body;
  try { body = await req.json(); } catch { return new Response('Bad JSON', { status: 400 }); }
  const { username = '', password = '' } = body;

  const okUser = timingSafeStringEqual(username, process.env.ADMIN_USERNAME || '');
  const okPass = timingSafeStringEqual(password, process.env.ADMIN_PASSWORD || '');
  if (!okUser || !okPass) {
    await recordFailure(ip);
    return new Response(JSON.stringify({ error: 'invalid_credentials' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  await clearRateLimit(ip);
  const secret = process.env.ADMIN_SESSION_SECRET || '';
  if (!secret) return new Response('Server misconfig', { status: 500 });

  const cookie = signSession({ u: process.env.ADMIN_USERNAME }, secret, SESSION_TTL);
  const cookieStr = `admin_session=${cookie}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL}`;
  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookieStr },
  });
};

export const config = { path: '/api/admin/login' };
