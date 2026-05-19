// netlify/functions/_shared/csv.js
const LIKERT_TO_NUM = { strongly_disagree: 1, disagree: 2, neutral: 3, agree: 4, strongly_agree: 5 };

function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\r\n;]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Serialize response rows to CSV.
 *  - UTF-8 BOM prefix (so Excel renders Arabic correctly)
 *  - CRLF line endings
 *  - RFC 4180 quoting (commas, quotes, semicolons, newlines)
 *  - Likert columns produce TWO entries: `<id>` (string) AND `<id>_num` (1–5)
 */
export function responsesToCSV(schema, responses) {
  const flat = [];
  for (const sec of schema.sections) for (const q of sec.questions) flat.push(q);

  const headers = ['responseId', 'submittedAt', 'name', 'email', 'isDuplicate'];
  for (const q of flat) {
    headers.push(q.id);
    if (q.type === 'likert') headers.push(`${q.id}_num`);
  }

  const lines = [headers.join(',')];
  for (const r of responses) {
    const cells = [
      csvCell(r.responseId),
      csvCell(r.submittedAt),
      csvCell(r.respondent?.name),
      csvCell(r.respondent?.email),
      csvCell(r.isDuplicate ? 1 : 0),
    ];
    for (const q of flat) {
      const v = r.answers?.[q.id];
      cells.push(csvCell(v));
      if (q.type === 'likert') {
        cells.push(csvCell(v != null ? (LIKERT_TO_NUM[v] ?? '') : ''));
      }
    }
    lines.push(cells.join(','));
  }

  return '﻿' + lines.join('\r\n');
}
