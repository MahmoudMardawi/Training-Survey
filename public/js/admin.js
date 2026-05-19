// public/js/admin.js
import { apiFetch } from './shared/api.js';
import {
  renderCategoryBars, renderLikertBar, renderStarsMini, renderTimeTrend, renderWordCloud,
} from './admin-charts.js';

let currentStats = null;
let filters = { range: 'all', includeDuplicates: false };
let respondents = [];

const $ = (sel) => document.querySelector(sel);

function buildQuery() {
  const params = new URLSearchParams();
  if (filters.includeDuplicates) params.set('includeDuplicates', 'true');
  const now = new Date();
  if (filters.range === 'today')   { const d = new Date(now); d.setHours(0,0,0,0); params.set('from', d.toISOString()); }
  if (filters.range === 'week')    { const d = new Date(now); d.setDate(d.getDate() - 7); params.set('from', d.toISOString()); }
  if (filters.range === 'month')   { const d = new Date(now); d.setDate(d.getDate() - 30); params.set('from', d.toISOString()); }
  return params.toString();
}

async function loadAll() {
  const dashboard = $('#dashboard');
  dashboard.innerHTML = '<div class="loading-state">جارٍ تحميل البيانات...</div>';

  let stats, listData;
  try {
    const q = buildQuery();
    [stats, listData] = await Promise.all([
      apiFetch(`/api/admin/stats?${q}`),
      apiFetch(`/api/admin/responses?${q}`),
    ]);
  } catch (err) {
    if (err.status === 401) { window.location.href = '/admin-login'; return; }
    dashboard.innerHTML = '<div class="empty-state"><div class="icon">⚠</div>تعذّر تحميل البيانات</div>';
    return;
  }
  currentStats = stats;
  respondents = listData.respondents;

  if (stats.kpis.totalResponses === 0) {
    dashboard.innerHTML = '<div class="empty-state full"><div class="icon">📭</div>لم تصلنا أي ردود بعد. ستظهر البيانات هنا فور وصول أول رد.</div>';
    $('#footer').hidden = false;
    return;
  }

  renderDashboard(stats);
  $('#footer').hidden = false;
}

function renderDashboard(stats) {
  const html = `
    ${renderKpis(stats.kpis)}
    ${renderInsights(stats.topRated, stats.bottomRated)}
    ${renderCategorySection(stats.categoryAverages)}
    ${renderQuestionBreakdown(stats.perQuestion, stats.categoryAverages)}
    ${renderLikertSection(stats.perQuestion)}
    ${renderQualitative(stats.textResponses, stats.wordCloud)}
    ${renderTimeAndRespondents(stats.timeTrend, respondents)}
  `;
  $('#dashboard').innerHTML = html;

  renderCategoryBars($('#cat-bars'), stats.categoryAverages);
  const likertQuestions = stats.perQuestion.filter(q => q.type === 'likert');
  for (const q of likertQuestions) {
    const el = document.getElementById(`lk-${q.id}`);
    if (el) renderLikertBar(el, q.distribution);
  }
  renderTimeTrend($('#time-chart'), stats.timeTrend);
  renderWordCloud($('#word-cloud'), stats.wordCloud, (word) => filterTextByWord(word));
}

function renderKpis(k) {
  const fmt = (n) => n == null ? '—' : String(n);
  return `
    <div class="tile kpi accent-green"><h3>إجمالي الردود</h3><div class="val">${fmt(k.totalResponses)}</div></div>
    <div class="tile kpi"><h3>الفريد</h3><div class="val">${fmt(k.uniqueRespondents)}</div></div>
    <div class="tile kpi accent-gold"><h3>متوسط الرضا</h3><div class="val">${k.overallSatisfactionAvg ?? '—'}</div></div>
    <div class="tile kpi"><h3>NPS</h3><div class="val">${fmt(k.npsScore)}</div></div>
    <div class="tile kpi"><h3>معدّل الإتمام</h3><div class="val">${Math.round((k.completionRate || 0) * 100)}٪</div></div>
  `;
}

function renderInsights(top, bottom) {
  const renderList = (items) => items.map(i => `<li><span class="score">${i.avg.toFixed(1)}</span><span>${i.label}</span></li>`).join('');
  return `
    <div class="tile insight top"><h3>🌟 الأعلى تقييماً</h3><ul>${renderList(top)}</ul></div>
    <div class="tile insight bottom"><h3>⚠ بحاجة إلى تطوير</h3><ul>${renderList(bottom)}</ul></div>
  `;
}

function renderCategorySection() {
  return `<div class="tile full"><h3>متوسطات الأقسام</h3><div id="cat-bars"></div></div>`;
}

function renderQuestionBreakdown(perQ, categories) {
  const items = categories.map(cat => {
    const qs = perQ.filter(q => q.sectionId === cat.id && (q.type === 'stars' || q.type === 'likert' || q.type === 'nps'));
    return `
      <details open><summary>${cat.title} (${qs.length})</summary>
        <div class="q-detail">
          ${qs.map(q => {
            if (q.type === 'stars') return `<div class="q-row-stat"><span class="lbl">${q.label}</span>${renderStarsMini(q.distribution)}<span class="avg">${q.avg ?? '—'}</span></div>`;
            if (q.type === 'likert') return `<div class="q-row-stat"><span class="lbl">${q.label}</span><span class="avg">${q.avg ?? '—'}</span></div>`;
            if (q.type === 'nps') return `<div class="q-row-stat"><span class="lbl">${q.label}</span><span class="avg">NPS ${q.promoters - q.detractors >= 0 ? '+' : ''}${q.count ? Math.round(((q.promoters - q.detractors)/q.count)*100) : 0}</span></div>`;
          }).join('')}
        </div>
      </details>
    `;
  }).join('');
  return `<div class="tile full q-breakdown"><h3>تفاصيل الأسئلة</h3>${items}</div>`;
}

function renderLikertSection(perQ) {
  const likertQs = perQ.filter(q => q.type === 'likert');
  if (likertQs.length === 0) return '';
  return `<div class="tile full"><h3>توزيع الإجابات على عبارات الموافقة</h3>
    ${likertQs.map(q => `
      <div style="margin-bottom:14px">
        <div style="font-size:13px;margin-bottom:4px">${q.label}</div>
        <div id="lk-${q.id}"></div>
      </div>
    `).join('')}
  </div>`;
}

function renderQualitative(textResponses, _wordCloudData) {
  return `
    <div class="tile half"><h3>☁ السحابة الكلامية</h3><div id="word-cloud" class="word-cloud"></div></div>
    <div class="tile half text-panel"><h3>💬 الإجابات النصية</h3>
      <input class="search" id="text-search" placeholder="ابحث...">
      <div class="filter">
        ${textResponses.map((t, i) => `<button class="btn-outline-admin text-cat-btn" data-cat="${t.id}" ${i === 0 ? 'data-active="true"' : ''}>${t.label.slice(0, 30)}...</button>`).join('')}
      </div>
      <div id="text-list" class="text-list"></div>
    </div>
  `;
}

function renderTimeAndRespondents(_timeTrend, respList) {
  return `
    <div class="tile half"><h3>📈 الردود مع الوقت</h3><div id="time-chart" class="chart-container"></div></div>
    <div class="tile half">
      <h3>👥 قائمة المستجيبين (${respList.length})</h3>
      <div style="max-height:300px;overflow-y:auto">
        <table class="resp-table">
          <thead><tr><th>#</th><th>الاسم</th><th>البريد</th><th>التاريخ</th><th>📋</th></tr></thead>
          <tbody>
            ${respList.map((r, i) => `
              <tr class="${r.isDuplicate ? 'dup' : ''}">
                <td>${i + 1}</td>
                <td>${escapeHtml(r.name)}</td>
                <td style="font-size:11px">${escapeHtml(r.email)}</td>
                <td style="font-size:11px">${new Date(r.submittedAt).toLocaleDateString('ar-SA')}</td>
                <td>${r.isDuplicate ? '🔁' : ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

let textState = { category: null, search: '', word: null };
function refreshTextList() {
  if (!currentStats) return;
  const cat = textState.category || currentStats.textResponses[0]?.id;
  const txt = currentStats.textResponses.find(t => t.id === cat);
  const list = $('#text-list');
  if (!txt) { list.innerHTML = ''; return; }
  let items = txt.responses;
  if (textState.search) items = items.filter(r => r.text.includes(textState.search));
  if (textState.word) items = items.filter(r => r.text.includes(textState.word));
  list.innerHTML = items.length
    ? items.map(r => `<div class="text-item"><span class="tag">${r.responseId.slice(-6)}</span>${escapeHtml(r.text)}</div>`).join('')
    : '<div class="empty-state" style="padding:20px">لا توجد نتائج</div>';
}

function filterTextByWord(word) {
  textState.word = textState.word === word ? null : word;
  refreshTextList();
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

document.addEventListener('change', (e) => {
  if (e.target.id === 'filter-range') { filters.range = e.target.value; loadAll(); }
  if (e.target.id === 'filter-duplicates') { filters.includeDuplicates = e.target.checked; loadAll(); }
});
document.addEventListener('click', async (e) => {
  if (e.target.id === 'refresh-btn') loadAll();
  if (e.target.id === 'logout-btn') {
    await apiFetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin-login';
  }
  if (e.target.id === 'export-json') downloadExport('json');
  if (e.target.id === 'export-csv')  downloadExport('csv');
  if (e.target.id === 'text-search') return;
  if (e.target.classList.contains('text-cat-btn')) {
    document.querySelectorAll('.text-cat-btn').forEach(b => b.removeAttribute('data-active'));
    e.target.setAttribute('data-active', 'true');
    textState.category = e.target.dataset.cat; textState.word = null;
    refreshTextList();
  }
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'text-search') { textState.search = e.target.value; refreshTextList(); }
});

function downloadExport(format) {
  const q = new URLSearchParams(buildQuery());
  q.set('format', format);
  window.location.href = `/api/admin/export?${q.toString()}`;
}

loadAll();
