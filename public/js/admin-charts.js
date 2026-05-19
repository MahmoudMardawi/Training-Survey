// public/js/admin-charts.js
// Minimal SVG chart helpers, no external libs.

const COLORS = {
  low: '#ef4444', mid: '#f59e0b', high: '#4ade80',
  green: '#019443', greenGlow: '#4ade80',
  gold: '#E9B90F', goldGlow: '#facc15',
  likert: ['#ef4444', '#f97316', '#a3a3a3', '#84cc16', '#4ade80'], // 5 stops
};

function classForAvg(avg) {
  if (avg == null) return 'bar-mid';
  if (avg < 3.0) return 'bar-low';
  if (avg < 3.7) return 'bar-mid';
  return 'bar-high';
}

/** Horizontal category bar chart (one row per category). */
export function renderCategoryBars(container, categories) {
  container.innerHTML = categories.map(c => {
    const pct = ((c.avg || 0) / 5) * 100;
    return `
      <div class="cat-bar">
        <span class="score">${(c.avg ?? 0).toFixed(1)}</span>
        <div class="track"><div class="fill ${classForAvg(c.avg)}" style="width:${pct}%"></div></div>
        <span class="name">${escapeHtml(c.title)}</span>
      </div>
    `;
  }).join('');
}

/** Likert distribution as a stacked horizontal bar. */
export function renderLikertBar(container, dist) {
  const order = ['strongly_disagree', 'disagree', 'neutral', 'agree', 'strongly_agree'];
  const total = order.reduce((s, k) => s + (dist[k] || 0), 0);
  if (total === 0) { container.innerHTML = '<div style="color:#6e7681;font-size:12px">لا توجد إجابات</div>'; return; }
  container.innerHTML = `
    <div class="likert-bar">
      ${order.map((k, i) => {
        const pct = ((dist[k] || 0) / total) * 100;
        if (pct === 0) return '';
        return `<span style="width:${pct}%;background:${COLORS.likert[i]}" title="${k}: ${dist[k]}"></span>`;
      }).join('')}
    </div>
  `;
}

/** Distribution mini-bar for a star question (5 bars side-by-side). */
export function renderStarsMini(dist) {
  const max = Math.max(...Object.values(dist), 1);
  return `<span class="dist" title="${Object.entries(dist).map(([k,v]) => `${k}★: ${v}`).join(' | ')}">
    ${['1','2','3','4','5'].map(k => {
      const h = Math.max(2, ((dist[k] || 0) / max) * 12);
      return `<span style="height:${h}px"></span>`;
    }).join('')}
  </span>`;
}

/** SVG line chart for time trend. */
export function renderTimeTrend(container, points) {
  if (!points.length) { container.innerHTML = '<div class="empty-state">لا توجد بيانات</div>'; return; }
  const W = 560, H = 180, P = 24;
  const maxC = Math.max(...points.map(p => p.count), 1);
  const stepX = (W - 2 * P) / Math.max(points.length - 1, 1);

  const coords = points.map((p, i) => {
    const x = P + i * stepX;
    const y = H - P - (p.count / maxC) * (H - 2 * P);
    return [x, y];
  });
  const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c[0].toFixed(1)} ${c[1].toFixed(1)}`).join(' ');

  container.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" aria-label="الردود مع الوقت">
      <path d="${pathD}" fill="none" stroke="${COLORS.greenGlow}" stroke-width="2" />
      ${coords.map((c, i) => `<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="3" fill="${COLORS.gold}" />`).join('')}
      <text x="${P}" y="${H - 4}" fill="#6e7681" font-size="10">${escapeHtml(points[0].date)}</text>
      <text x="${W - P}" y="${H - 4}" fill="#6e7681" font-size="10" text-anchor="end">${escapeHtml(points[points.length - 1].date)}</text>
    </svg>
  `;
}

/** Render word cloud as resized HTML spans. */
export function renderWordCloud(container, words, onClick) {
  if (!words.length) { container.innerHTML = '<div class="empty-state">لا توجد بيانات نصية</div>'; return; }
  const maxC = Math.max(...words.map(w => w.count), 1);
  container.innerHTML = words.map(w => {
    const fontSize = 12 + Math.log(w.count + 1) / Math.log(maxC + 1) * 24;
    return `<span data-word="${escapeAttr(w.word)}" style="font-size:${fontSize.toFixed(1)}px">${escapeHtml(w.word)}</span>`;
  }).join('');
  if (onClick) {
    container.addEventListener('click', e => {
      const sp = e.target.closest('[data-word]');
      if (sp) onClick(sp.dataset.word);
    });
  }
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function escapeAttr(s) { return String(s).replace(/"/g, '&quot;'); }
