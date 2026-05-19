// public/js/survey.js
import { apiFetch, loadQuestions } from './shared/api.js';
import { toArDigits, LIKERT_ORDER, LIKERT_LABELS } from './shared/i18n.js';

const DRAFT_KEY = 'training-survey-draft-v1';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const state = {
  schema: null,
  respondent: { name: '', email: '' },
  answers: {},
  totalRequired: 0,
};

const el = {
  gate:           document.getElementById('gate'),
  survey:         document.getElementById('survey'),
  nameInput:      document.getElementById('name'),
  emailInput:     document.getElementById('email'),
  nameErr:        document.getElementById('name-err'),
  emailErr:       document.getElementById('email-err'),
  startBtn:       document.getElementById('start-btn'),
  sectionsEl:     document.getElementById('sections'),
  progressFill:   document.getElementById('progress-fill'),
  progressCount:  document.getElementById('progress-count'),
  submitBtn:      document.getElementById('submit-btn'),
  dupModal:       document.getElementById('duplicate-modal'),
  dupConfirm:     document.getElementById('dup-confirm'),
  dupCancel:      document.getElementById('dup-cancel'),
  toast:          document.getElementById('toast'),
};

function showToast(msg, type = 'error') {
  el.toast.textContent = msg;
  el.toast.className = `toast ${type === 'success' ? 'success' : ''}`;
  el.toast.hidden = false;
  setTimeout(() => { el.toast.hidden = true; }, 4000);
}

function saveDraft() {
  localStorage.setItem(DRAFT_KEY, JSON.stringify({
    respondent: state.respondent, answers: state.answers, ts: Date.now(),
  }));
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function clearDraft() { localStorage.removeItem(DRAFT_KEY); }

function flatQuestions() {
  return state.schema.sections.flatMap(s => s.questions);
}

function renderStars(q) {
  const current = state.answers[q.id];
  const buttons = [];
  for (let i = 5; i >= 1; i--) {
    buttons.push(`<button type="button" role="radio" aria-checked="${current === i}" data-val="${i}" aria-label="${i} من ٥">★</button>`);
  }
  return `<div class="stars" role="radiogroup" aria-label="${q.label}" data-q="${q.id}">${buttons.join('')}</div>`;
}

function renderLikert(q) {
  const current = state.answers[q.id];
  const buttons = LIKERT_ORDER.map(v =>
    `<button type="button" role="radio" aria-checked="${current === v}" data-val="${v}">${LIKERT_LABELS[v]}</button>`
  ).join('');
  return `<div class="likert" role="radiogroup" aria-label="${q.label}" data-q="${q.id}">${buttons}</div>`;
}

function renderNps(q) {
  const current = state.answers[q.id];
  const buttons = [];
  for (let i = 10; i >= 0; i--) {
    buttons.push(`<button type="button" role="radio" aria-checked="${current === i}" data-val="${i}">${toArDigits(i)}</button>`);
  }
  return `
    <div class="nps" role="radiogroup" aria-label="${q.label}" data-q="${q.id}">${buttons.join('')}</div>
    <div class="legend"><span>أوصي بشدة (١٠)</span><span>لا أوصي إطلاقاً (٠)</span></div>
  `;
}

function renderTextarea(q) {
  const current = state.answers[q.id] || '';
  const max = q.maxLength || 2000;
  return `
    <textarea data-q="${q.id}" maxlength="${max}" rows="4">${current.replace(/</g, '&lt;')}</textarea>
    <div class="charcount"><span data-count="${q.id}">${toArDigits(current.length)}</span> / ${toArDigits(max)}</div>
  `;
}

function renderQuestion(q) {
  let widget = '';
  if (q.type === 'stars')    widget = renderStars(q);
  else if (q.type === 'likert')  widget = renderLikert(q);
  else if (q.type === 'nps')     widget = renderNps(q);
  else if (q.type === 'textarea') widget = renderTextarea(q);

  const required = q.required ? '<span class="required" aria-hidden="true">*</span>' : '';
  return `
    <div class="q-row" data-qrow="${q.id}">
      <div class="label">${q.label}${required}</div>
      ${widget}
    </div>
  `;
}

function renderSurvey() {
  el.sectionsEl.innerHTML = state.schema.sections.map(sec => `
    <section class="section">
      <h2>${sec.title}</h2>
      ${sec.questions.map(renderQuestion).join('')}
    </section>
  `).join('');
}

function updateProgress() {
  const required = flatQuestions().filter(q => q.required);
  const filled = required.filter(q => {
    const v = state.answers[q.id];
    return v !== undefined && v !== null && v !== '';
  }).length;
  const pct = (filled / Math.max(required.length, 1)) * 100;
  el.progressFill.style.width = `${pct}%`;
  el.progressCount.textContent = `${toArDigits(filled)} من ${toArDigits(required.length)} سؤال`;
  el.submitBtn.disabled = filled !== required.length;
}

function setAnswer(qid, value) {
  state.answers[qid] = value;
  document.querySelectorAll(`[data-q="${qid}"] [data-val]`).forEach(b => {
    const eq = (b.dataset.val == String(value));
    b.setAttribute('aria-checked', eq ? 'true' : 'false');
  });
  saveDraft();
  updateProgress();
}

function setText(qid, value) {
  state.answers[qid] = value;
  const counter = document.querySelector(`[data-count="${qid}"]`);
  if (counter) counter.textContent = toArDigits(value.length);
  saveDraft();
  updateProgress();
}

function attachQuestionHandlers() {
  el.sectionsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-val]');
    if (!btn) return;
    const group = btn.closest('[data-q]');
    if (!group) return;
    const qid = group.dataset.q;
    const q = flatQuestions().find(qq => qq.id === qid);
    let val = btn.dataset.val;
    if (q?.type === 'stars' || q?.type === 'nps') val = Number(val);
    setAnswer(qid, val);
  });

  el.sectionsEl.addEventListener('input', (e) => {
    const ta = e.target.closest('textarea[data-q]');
    if (!ta) return;
    setText(ta.dataset.q, ta.value);
  });

  el.sectionsEl.addEventListener('keydown', (e) => {
    const group = e.target.closest('[role="radiogroup"]');
    if (!group) return;
    const buttons = [...group.querySelectorAll('[data-val]')];
    const idx = buttons.indexOf(document.activeElement);
    if (idx === -1) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')     { buttons[Math.min(idx + 1, buttons.length - 1)]?.focus(); e.preventDefault(); }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown')  { buttons[Math.max(idx - 1, 0)]?.focus(); e.preventDefault(); }
    if (e.key === ' ' || e.key === 'Enter')               { document.activeElement.click(); e.preventDefault(); }
  });
}

function validateGate() {
  const name = el.nameInput.value.trim();
  const email = el.emailInput.value.trim().toLowerCase();
  let ok = true;
  if (!name) { el.nameErr.hidden = false; el.nameInput.classList.add('invalid'); ok = false; }
  else      { el.nameErr.hidden = true;  el.nameInput.classList.remove('invalid'); }
  if (!EMAIL_RE.test(email)) { el.emailErr.hidden = false; el.emailInput.classList.add('invalid'); ok = false; }
  else                       { el.emailErr.hidden = true;  el.emailInput.classList.remove('invalid'); }
  return ok ? { name, email } : null;
}

function startSurvey(respondent) {
  state.respondent = respondent;
  el.gate.hidden = true;
  el.survey.hidden = false;
  renderSurvey();
  attachQuestionHandlers();
  updateProgress();
  saveDraft();
}

async function submit(confirmDuplicate = false) {
  const missing = flatQuestions().find(q => q.required && (state.answers[q.id] == null || state.answers[q.id] === ''));
  if (missing) {
    document.querySelector(`[data-qrow="${missing.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    showToast('يرجى الإجابة على جميع الأسئلة المطلوبة');
    return;
  }

  el.submitBtn.classList.add('loading'); el.submitBtn.disabled = true;
  try {
    const data = await apiFetch('/api/submit', {
      method: 'POST',
      body: JSON.stringify({
        name: state.respondent.name,
        email: state.respondent.email,
        answers: state.answers,
        questionsVersion: state.schema.version,
        confirmDuplicate,
      }),
    });
    if (data.requiresConfirmation) {
      el.submitBtn.classList.remove('loading'); el.submitBtn.disabled = false;
      el.dupModal.hidden = false;
      return;
    }
    clearDraft();
    window.location.href = '/thanks';
  } catch (err) {
    el.submitBtn.classList.remove('loading'); el.submitBtn.disabled = false;
    showToast('تعذّر الإرسال — يرجى المحاولة مرة أخرى');
  }
}

function init() {
  el.startBtn.addEventListener('click', async () => {
    const r = validateGate();
    if (!r) return;

    if (!state.schema) {
      try { state.schema = await loadQuestions(); }
      catch { showToast('تعذّر تحميل الاستبيان — يرجى إعادة تحميل الصفحة'); return; }
    }

    const draft = loadDraft();
    if (draft && draft.respondent?.email === r.email) {
      state.answers = draft.answers || {};
    }
    startSurvey(r);
  });

  el.submitBtn.addEventListener('click', () => submit(false));
  el.dupConfirm.addEventListener('click', () => { el.dupModal.hidden = true; submit(true); });
  el.dupCancel.addEventListener('click', () => { el.dupModal.hidden = true; });
}

init();
