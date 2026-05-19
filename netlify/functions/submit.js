// netlify/functions/submit.js
import crypto from 'node:crypto';
import { responsesStore, emailIndexStore } from './_shared/blobs.js';
import { hashEmail } from './_shared/auth.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function stripHTML(str) {
  return String(str ?? '').replace(/<[^>]*>/g, '').trim();
}

function nowIso() {
  return new Date().toISOString();
}

function shortId() {
  return crypto.randomBytes(4).toString('hex');
}

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  let body;
  try { body = await req.json(); } catch { return new Response('Bad JSON', { status: 400 }); }

  const name = stripHTML(body.name).slice(0, 200);
  const email = stripHTML(body.email).toLowerCase().slice(0, 320);
  const answers = body.answers && typeof body.answers === 'object' ? body.answers : null;
  const confirmDuplicate = !!body.confirmDuplicate;

  if (!name || !EMAIL_RE.test(email) || !answers) {
    return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Sanitize text answers (strip any HTML)
  const cleanAnswers = {};
  for (const [k, v] of Object.entries(answers)) {
    if (typeof v === 'string') cleanAnswers[k] = stripHTML(v).slice(0, 2000);
    else cleanAnswers[k] = v;
  }

  const emailHash = hashEmail(email);
  const idxStore = emailIndexStore();
  const existingIndex = (await idxStore.get(emailHash, { type: 'json' })) || null;

  if (existingIndex && !confirmDuplicate) {
    // Soft-warn: ask client to confirm before storing duplicate
    return new Response(JSON.stringify({ requiresConfirmation: true, isDuplicate: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  const submittedAt = nowIso();
  const responseId = `${submittedAt.replace(/[:.]/g, '-')}-${shortId()}`;
  const submissionCount = (existingIndex?.submissionCount || 0) + 1;
  const response = {
    responseId,
    submittedAt,
    respondent: { name, email },
    isDuplicate: submissionCount > 1,
    submissionCountForEmail: submissionCount,
    userAgent: req.headers.get('user-agent') || '',
    questionsVersion: typeof body.questionsVersion === 'number' ? body.questionsVersion : 1,
    answers: cleanAnswers,
  };

  await responsesStore().setJSON(responseId, response);

  const newIndex = {
    emailHash,
    firstSubmittedAt: existingIndex?.firstSubmittedAt || submittedAt,
    submissionCount,
    responseIds: [...(existingIndex?.responseIds || []), responseId],
  };
  await idxStore.setJSON(emailHash, newIndex);

  return new Response(JSON.stringify({ responseId, isDuplicate: response.isDuplicate }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
};

export const config = { path: '/api/submit' };
