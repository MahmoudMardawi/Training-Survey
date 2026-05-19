// tests/csv.test.js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { responsesToCSV } from '../netlify/functions/_shared/csv.js';

const schema = {
  sections: [
    { id: 's', questions: [
      { id: 'q1', type: 'stars',    label: 'q1' },
      { id: 'q2', type: 'likert',   label: 'q2' },
      { id: 'q3', type: 'nps',      label: 'q3' },
      { id: 't1', type: 'textarea', label: 't1' },
    ]},
  ],
};

const rows = [
  { responseId: 'r1', submittedAt: '2026-05-20T10:00:00Z', isDuplicate: false,
    respondent: { name: 'محمد', email: 'a@b.com' },
    answers: { q1: 5, q2: 'agree', q3: 9, t1: 'نص "مع علامات" يحتوي ; , فاصلة' } },
];

describe('responsesToCSV', () => {
  test('starts with UTF-8 BOM', () => {
    const csv = responsesToCSV(schema, rows);
    assert.equal(csv.charCodeAt(0), 0xFEFF);
  });

  test('header includes likert numeric column', () => {
    const csv = responsesToCSV(schema, rows);
    const firstLine = csv.replace(/^﻿/, '').split('\r\n')[0];
    assert.ok(firstLine.includes('q2'));
    assert.ok(firstLine.includes('q2_num'));
  });

  test('values are properly quoted (commas/quotes preserved)', () => {
    const csv = responsesToCSV(schema, rows);
    const dataLine = csv.replace(/^﻿/, '').split('\r\n')[1];
    assert.ok(dataLine.includes('"نص ""مع علامات"" يحتوي ; , فاصلة"'));
  });

  test('CRLF line endings', () => {
    const csv = responsesToCSV(schema, rows);
    assert.ok(csv.includes('\r\n'));
  });

  test('likert column has both string and numeric variants', () => {
    const csv = responsesToCSV(schema, rows);
    const lines = csv.replace(/^﻿/, '').split('\r\n');
    const header = lines[0].split(',');
    const data   = lines[1].split(',');
    const idxQ2     = header.indexOf('q2');
    const idxQ2Num  = header.indexOf('q2_num');
    assert.equal(data[idxQ2], 'agree');
    assert.equal(data[idxQ2Num], '4');
  });

  test('isDuplicate column included as 0/1', () => {
    const csv = responsesToCSV(schema, rows);
    const header = csv.replace(/^﻿/, '').split('\r\n')[0].split(',');
    assert.ok(header.includes('isDuplicate'));
  });
});
