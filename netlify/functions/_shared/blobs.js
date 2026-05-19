// netlify/functions/_shared/blobs.js
import { getStore } from '@netlify/blobs';

/**
 * Thin facade so that:
 *   - Function code never imports @netlify/blobs directly (easier to swap/mock).
 *   - Bucket names are centralized.
 *   - JSON read/write is convenient.
 *
 * Buckets:
 *   - responses     : key = `{ISO}-{shortId}`, value = full response object
 *   - email_index   : key = sha256(email), value = { emailHash, firstSubmittedAt, submissionCount, responseIds }
 *   - rate_limit    : key = ip-hash, value = { count, firstAttemptAt }
 */
export function responsesStore() { return getStore('responses'); }
export function emailIndexStore() { return getStore('email_index'); }
export function rateLimitStore() { return getStore('rate_limit'); }

export async function listAllResponses() {
  const store = responsesStore();
  const { blobs } = await store.list();
  const out = [];
  for (const b of blobs) {
    const json = await store.get(b.key, { type: 'json' });
    if (json) out.push(json);
  }
  // newest first
  out.sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
  return out;
}
