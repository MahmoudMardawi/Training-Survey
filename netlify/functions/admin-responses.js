// netlify/functions/admin-responses.js
import { verifySession } from './_shared/auth.js';
import { listAllResponses } from './_shared/blobs.js';

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
  const from = url.searchParams.get('from');
  const to   = url.searchParams.get('to');
  const includeDuplicates = url.searchParams.get('includeDuplicates') === 'true';

  const all = await listAllResponses();
  const list = all
    .filter(r => {
      if (!includeDuplicates && r.isDuplicate) return false;
      const t = Date.parse(r.submittedAt);
      if (from && t < Date.parse(from)) return false;
      if (to   && t > Date.parse(to))   return false;
      return true;
    })
    .map(r => ({
      responseId: r.responseId,
      submittedAt: r.submittedAt,
      name: r.respondent?.name,
      email: r.respondent?.email,
      isDuplicate: !!r.isDuplicate,
      submissionCountForEmail: r.submissionCountForEmail || 1,
    }));

  return new Response(JSON.stringify({ count: list.length, respondents: list }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
};

export const config = { path: '/api/admin/responses' };
