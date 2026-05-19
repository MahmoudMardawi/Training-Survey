// tests/stats.test.js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { computeStats } from '../netlify/functions/_shared/stats.js';

const schema = {
  version: 1,
  sections: [
    { id: 'trainer', title: 'تقييم المدرّب', questions: [
      { id: 'q1', type: 'stars',  label: '...', required: true },
      { id: 'q2', type: 'likert', label: '...', required: true },
    ]},
    { id: 'overall', title: 'التقييم العام', questions: [
      { id: 'q3', type: 'nps', label: '...', required: true },
    ]},
    { id: 'feedback', title: 'الملاحظات', questions: [
      { id: 't1', type: 'textarea', label: '...', required: true },
    ]},
  ],
};

const responses = [
  { responseId: 'r1', submittedAt: '2026-05-20T10:00:00Z', isDuplicate: false,
    respondent: { name: 'A', email: 'a@x.com' },
    answers: { q1: 5, q2: 'agree', q3: 9, t1: 'كان البرنامج ممتازاً والمحتوى رائعاً' } },
  { responseId: 'r2', submittedAt: '2026-05-20T11:00:00Z', isDuplicate: false,
    respondent: { name: 'B', email: 'b@x.com' },
    answers: { q1: 4, q2: 'strongly_agree', q3: 7, t1: 'المحتوى مفيد جداً' } },
  { responseId: 'r3', submittedAt: '2026-05-21T09:00:00Z', isDuplicate: true,
    respondent: { name: 'A', email: 'a@x.com' },
    answers: { q1: 1, q2: 'disagree', q3: 3, t1: 'تجربة سيئة' } },
];

describe('computeStats', () => {
  test('totals and uniqueRespondents reflect duplicate filter', () => {
    const stats = computeStats(schema, responses, { includeDuplicates: false });
    assert.equal(stats.kpis.totalResponses, 2);
    assert.equal(stats.kpis.uniqueRespondents, 2);

    const statsAll = computeStats(schema, responses, { includeDuplicates: true });
    assert.equal(statsAll.kpis.totalResponses, 3);
  });

  test('star average is correct', () => {
    const stats = computeStats(schema, responses, { includeDuplicates: false });
    const q1 = stats.perQuestion.find(q => q.id === 'q1');
    assert.equal(q1.avg, 4.5);
    assert.deepEqual(q1.distribution, { '1':0, '2':0, '3':0, '4':1, '5':1 });
  });

  test('likert distribution is correct', () => {
    const stats = computeStats(schema, responses, { includeDuplicates: false });
    const q2 = stats.perQuestion.find(q => q.id === 'q2');
    assert.equal(q2.distribution.agree, 1);
    assert.equal(q2.distribution.strongly_agree, 1);
    assert.equal(q2.distribution.neutral, 0);
  });

  test('NPS computed correctly', () => {
    const stats = computeStats(schema, responses, { includeDuplicates: false });
    const q3 = stats.perQuestion.find(q => q.id === 'q3');
    assert.equal(q3.promoters, 1);
    assert.equal(q3.passives, 1);
    assert.equal(q3.detractors, 0);
    assert.equal(stats.kpis.npsScore, 50);
  });

  test('category averages computed', () => {
    const stats = computeStats(schema, responses, { includeDuplicates: false });
    const trainer = stats.categoryAverages.find(c => c.id === 'trainer');
    assert.equal(trainer.avg, 4.5);
  });

  test('text responses included (responseId only, no respondent)', () => {
    const stats = computeStats(schema, responses, { includeDuplicates: false });
    const t1 = stats.textResponses.find(t => t.id === 't1');
    assert.equal(t1.responses.length, 2);
    assert.equal(t1.responses[0].responseId, 'r1');
    assert.equal(t1.responses[0].text, 'كان البرنامج ممتازاً والمحتوى رائعاً');
    assert.ok(!('name' in t1.responses[0]));
  });

  test('word cloud filters stopwords and counts frequency', () => {
    const stats = computeStats(schema, responses, { includeDuplicates: false });
    const words = stats.wordCloud.map(w => w.word);
    assert.ok(words.includes('المحتوى'));
    assert.ok(!words.includes('في'));
  });

  test('topRated and bottomRated identified', () => {
    const stats = computeStats(schema, responses, { includeDuplicates: false });
    assert.ok(Array.isArray(stats.topRated));
    assert.ok(stats.topRated.length <= 3);
    assert.ok(Array.isArray(stats.bottomRated));
  });

  test('timeTrend groups by date', () => {
    const stats = computeStats(schema, responses, { includeDuplicates: false });
    const may20 = stats.timeTrend.find(d => d.date === '2026-05-20');
    assert.equal(may20.count, 2);
  });

  test('date filter restricts to range', () => {
    const stats = computeStats(schema, responses, {
      includeDuplicates: true,
      from: '2026-05-21T00:00:00Z',
      to:   '2026-05-21T23:59:59Z',
    });
    assert.equal(stats.kpis.totalResponses, 1);
  });
});
