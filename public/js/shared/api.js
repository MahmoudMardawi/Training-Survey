// public/js/shared/api.js
export async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function loadQuestions() {
  const res = await fetch('/questions.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('Failed to load questions.json');
  return res.json();
}
