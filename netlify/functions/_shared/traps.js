// netlify/functions/_shared/traps.js
//
// Attention-check scoring. Server-only — the rules below are NOT served to
// the client, so a malicious user cannot inspect which questions are traps
// or what answer is expected.
//
// Three kinds of traps:
//   - bogus       : the answer must match `expected` (e.g., obviously-false
//                   statement should be disagreed with).
//   - self_report : the respondent declares they paid attention; honest
//                   responders will agree.
//   - consistency : paired with another regular question; the trap's answer
//                   should be in agreement with the paired question's answer.
//                   * likert trap paired with stars: 4-5★ ↔ agree/strongly_agree;
//                                                   1-2★ ↔ disagree/strongly_disagree;
//                                                   3★ → any answer acceptable.
//                   * stars trap paired with stars: within ±1 star.

export const TRAP_RULES = [
  {
    id: 'attn_trainer_clear',
    kind: 'consistency',
    pairWith: 'trainer_clarity',
  },
  {
    id: 'attn_sys_search',
    kind: 'consistency_stars',
    pairWith: 'sys_search',
  },
  {
    id: 'attn_bogus_topic',
    kind: 'bogus',
    expected: ['strongly_disagree', 'disagree'],
  },
  {
    id: 'attn_content_useful',
    kind: 'consistency',
    pairWith: 'content_relevance',
  },
  {
    id: 'attn_self_report',
    kind: 'self_report',
    expected: ['agree', 'strongly_agree'],
  },
];

const SUSPECT_THRESHOLD = 3; // ≥ this many failures → mark as suspect

function passConsistencyLikertVsStars(likertAns, starsAns) {
  if (typeof starsAns !== 'number') return true; // pair unanswered → can't compare
  if (starsAns >= 4) return ['agree', 'strongly_agree'].includes(likertAns);
  if (starsAns <= 2) return ['disagree', 'strongly_disagree'].includes(likertAns);
  return true; // neutral pair (3 stars) — any answer is acceptable
}

function passConsistencyStarsVsStars(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') return true;
  return Math.abs(a - b) <= 1;
}

/**
 * Score attention checks against a submission's answers map.
 * @returns {{ failed: number, checked: number, isSuspect: boolean, failedIds: string[] }}
 */
export function scoreAttention(answers) {
  let failed = 0;
  let checked = 0;
  const failedIds = [];

  for (const rule of TRAP_RULES) {
    const ans = answers[rule.id];
    if (ans === undefined || ans === null || ans === '') continue;
    checked++;

    let pass = true;
    if (rule.kind === 'bogus' || rule.kind === 'self_report') {
      pass = rule.expected.includes(ans);
    } else if (rule.kind === 'consistency') {
      pass = passConsistencyLikertVsStars(ans, answers[rule.pairWith]);
    } else if (rule.kind === 'consistency_stars') {
      pass = passConsistencyStarsVsStars(ans, answers[rule.pairWith]);
    }

    if (!pass) {
      failed++;
      failedIds.push(rule.id);
    }
  }

  return {
    failed,
    checked,
    isSuspect: failed >= SUSPECT_THRESHOLD,
    failedIds,
  };
}
