// netlify/functions/admin-export.js
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { verifySession } from './_shared/auth.js';
import { listAllResponses } from './_shared/blobs.js';
import { responsesToCSV } from './_shared/csv.js';

function getCookie(req, name) {
  const raw = req.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const [k, v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v || '');
  }
  return null;
}

export default async (req) => {
  if (req.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });

  const session = verifySession(getCookie(req, 'admin_session'), process.env.ADMIN_SESSION_SECRET || '');
  if (!session) return new Response('Unauthorized', { status: 401 });

  const url = new URL(req.url);
  const format = (url.searchParams.get('format') || 'json').toLowerCase();
  const from = url.searchParams.get('from');
  const to   = url.searchParams.get('to');
  const includeDuplicates = url.searchParams.get('includeDuplicates') === 'true';

  const all = await listAllResponses();
  const filtered = all.filter(r => {
    if (!includeDuplicates && r.isDuplicate) return false;
    const t = Date.parse(r.submittedAt);
    if (from && t < Date.parse(from)) return false;
    if (to   && t > Date.parse(to))   return false;
    return true;
  });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');

  if (format === 'csv') {
    const schemaText = await readFile(path.join(process.cwd(), 'public', 'questions.json'), 'utf8');
    const schema = JSON.parse(schemaText);
    const csv = responsesToCSV(schema, filtered);
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="training-survey-${stamp}.csv"`,
      },
    });
  }

  const json = JSON.stringify({
    exportedAt: new Date().toISOString(),
    questionsVersion: filtered[0]?.questionsVersion || 1,
    responseCount: filtered.length,
    responses: filtered,
  }, null, 2);

  return new Response(json, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="training-survey-${stamp}.json"`,
    },
  });
};

export const config = { path: '/api/admin/export' };
