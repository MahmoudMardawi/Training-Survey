// netlify/functions/admin-stats.js
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { verifySession } from './_shared/auth.js';
import { listAllResponses } from './_shared/blobs.js';
import { computeStats } from './_shared/stats.js';

function getCookie(req, name) {
  const raw = req.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const [k, v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v || '');
  }
  return null;
}

let cachedSchema = null;
async function getSchema() {
  if (cachedSchema) return cachedSchema;
  // Functions run from netlify/functions/. questions.json is in public/.
  const filePath = path.join(process.cwd(), 'public', 'questions.json');
  const text = await readFile(filePath, 'utf8');
  cachedSchema = JSON.parse(text);
  return cachedSchema;
}

export default async (req) => {
  if (req.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });

  const cookie = getCookie(req, 'admin_session');
  const session = verifySession(cookie, process.env.ADMIN_SESSION_SECRET || '');
  if (!session) return new Response('Unauthorized', { status: 401 });

  const url = new URL(req.url);
  const opts = {
    from: url.searchParams.get('from') || undefined,
    to:   url.searchParams.get('to')   || undefined,
    includeDuplicates: url.searchParams.get('includeDuplicates') === 'true',
  };

  const [schema, responses] = await Promise.all([getSchema(), listAllResponses()]);
  const stats = computeStats(schema, responses, opts);
  return new Response(JSON.stringify(stats), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
};

export const config = { path: '/api/admin/stats' };
