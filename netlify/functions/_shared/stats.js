// netlify/functions/_shared/stats.js
import { AR_STOPWORDS } from './stopwords-ar.js';

const LIKERT_TO_NUM = { strongly_disagree: 1, disagree: 2, neutral: 3, agree: 4, strongly_agree: 5 };

function round1(n) { return Math.round(n * 10) / 10; }

function inRange(iso, from, to) {
  if (!from && !to) return true;
  const t = Date.parse(iso);
  if (from && t < Date.parse(from)) return false;
  if (to   && t > Date.parse(to))   return false;
  return true;
}

export function computeStats(schema, allResponses, { from, to, includeDuplicates = false, includeSuspect = false } = {}) {
  // Always count suspect submissions for the KPI, even when excluded from stats.
  const inDateAndNotDup = allResponses.filter(r =>
    inRange(r.submittedAt, from, to) && (includeDuplicates || !r.isDuplicate)
  );
  const suspectCount = inDateAndNotDup.filter(r => r.isSuspect).length;

  const filtered = inDateAndNotDup.filter(r => includeSuspect || !r.isSuspect);

  const questions = [];
  for (const sec of schema.sections) {
    for (const q of sec.questions) {
      questions.push({ ...q, sectionId: sec.id });
    }
  }

  const totalResponses = filtered.length;
  const uniqueEmails = new Set(filtered.map(r => (r.respondent?.email || '').toLowerCase()));
  const uniqueRespondents = uniqueEmails.size;

  const requiredIds = questions.filter(q => q.required).map(q => q.id);
  const completionPerResponse = filtered.map(r => {
    const answered = requiredIds.filter(id => r.answers?.[id] !== null && r.answers?.[id] !== undefined && r.answers?.[id] !== '').length;
    return answered / Math.max(requiredIds.length, 1);
  });
  const completionRate = totalResponses > 0
    ? completionPerResponse.reduce((a, b) => a + b, 0) / totalResponses
    : 0;

  const perQuestion = [];
  for (const q of questions) {
    const vals = filtered.map(r => r.answers?.[q.id]).filter(v => v !== null && v !== undefined && v !== '');

    if (q.type === 'stars') {
      const dist = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
      let sum = 0;
      for (const v of vals) { dist[String(v)] = (dist[String(v)] || 0) + 1; sum += Number(v); }
      perQuestion.push({
        id: q.id, sectionId: q.sectionId, type: 'stars', label: q.label,
        avg: vals.length ? round1(sum / vals.length) : null,
        count: vals.length,
        distribution: dist,
      });
    } else if (q.type === 'likert') {
      const dist = { strongly_disagree: 0, disagree: 0, neutral: 0, agree: 0, strongly_agree: 0 };
      let sum = 0;
      for (const v of vals) { dist[v] = (dist[v] || 0) + 1; sum += (LIKERT_TO_NUM[v] || 0); }
      perQuestion.push({
        id: q.id, sectionId: q.sectionId, type: 'likert', label: q.label,
        avg: vals.length ? round1(sum / vals.length) : null,
        count: vals.length,
        distribution: dist,
      });
    } else if (q.type === 'nps') {
      const dist = Object.fromEntries([...Array(11).keys()].map(i => [String(i), 0]));
      let promoters = 0, passives = 0, detractors = 0;
      for (const v of vals) {
        dist[String(v)] = (dist[String(v)] || 0) + 1;
        if (v >= 9) promoters++;
        else if (v >= 7) passives++;
        else detractors++;
      }
      perQuestion.push({
        id: q.id, sectionId: q.sectionId, type: 'nps', label: q.label,
        count: vals.length,
        distribution: dist,
        promoters, passives, detractors,
      });
    } else if (q.type === 'textarea') {
      perQuestion.push({
        id: q.id, sectionId: q.sectionId, type: 'textarea', label: q.label,
        count: vals.length,
      });
    }
  }

  const categoryAverages = [];
  for (const sec of schema.sections) {
    const inSec = perQuestion.filter(q => q.sectionId === sec.id && (q.type === 'stars' || q.type === 'likert'));
    if (inSec.length === 0) continue;
    const totalAvg = inSec.reduce((s, q) => s + (q.avg || 0), 0) / inSec.length;
    categoryAverages.push({ id: sec.id, title: sec.title, avg: round1(totalAvg), count: filtered.length });
  }

  const ranked = perQuestion
    .filter(q => (q.type === 'stars' || q.type === 'likert') && q.avg != null)
    .sort((a, b) => b.avg - a.avg);
  const topRated = ranked.slice(0, 3).map(q => ({ id: q.id, label: q.label, avg: q.avg }));
  const bottomRated = ranked.slice(-3).reverse().map(q => ({ id: q.id, label: q.label, avg: q.avg }));

  const npsQ = perQuestion.find(q => q.type === 'nps');
  const npsScore = npsQ && npsQ.count > 0
    ? Math.round(((npsQ.promoters - npsQ.detractors) / npsQ.count) * 100)
    : null;

  const rateables = perQuestion.filter(q => (q.type === 'stars' || q.type === 'likert') && q.avg != null);
  const overallSatisfactionAvg = rateables.length
    ? round1(rateables.reduce((s, q) => s + q.avg, 0) / rateables.length)
    : null;

  const textResponses = [];
  for (const q of questions.filter(q => q.type === 'textarea')) {
    const responses = filtered
      .filter(r => r.answers?.[q.id] && String(r.answers[q.id]).trim() !== '')
      .map(r => ({ responseId: r.responseId, text: r.answers[q.id] }));
    textResponses.push({ id: q.id, label: q.label, responses });
  }

  const wordCounts = new Map();
  for (const t of textResponses) {
    for (const r of t.responses) {
      const tokens = String(r.text).split(/[\s,.!?؟،؛:"'()\-—_\/\[\]{}]+/u);
      for (const raw of tokens) {
        const w = raw.replace(/[ً-ٰٟ]/g, '');
        if (!w || w.length < 3) continue;
        if (AR_STOPWORDS.has(w)) continue;
        if (/^[a-zA-Z0-9]+$/.test(w)) continue;
        wordCounts.set(w, (wordCounts.get(w) || 0) + 1);
      }
    }
  }
  const wordCloud = [...wordCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 80)
    .map(([word, count]) => ({ word, count }));

  const dateMap = new Map();
  for (const r of filtered) {
    const d = r.submittedAt.slice(0, 10);
    dateMap.set(d, (dateMap.get(d) || 0) + 1);
  }
  const timeTrend = [...dateMap.entries()].sort().map(([date, count]) => ({ date, count }));

  return {
    filters: { from: from || null, to: to || null, includeDuplicates, includeSuspect },
    kpis: {
      totalResponses,
      uniqueRespondents,
      overallSatisfactionAvg,
      npsScore,
      completionRate: round1(completionRate * 100) / 100,
      suspectCount,
    },
    categoryAverages,
    perQuestion,
    topRated,
    bottomRated,
    textResponses,
    wordCloud,
    timeTrend,
  };
}
