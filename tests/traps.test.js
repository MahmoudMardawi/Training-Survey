// tests/traps.test.js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { scoreAttention } from '../netlify/functions/_shared/traps.js';

const honest = {
  trainer_clarity: 5,
  sys_search: 4,
  content_relevance: 5,
  attn_trainer_clear: 'strongly_agree',
  attn_sys_search: 5,
  attn_bogus_topic: 'strongly_disagree',
  attn_content_useful: 'agree',
  attn_self_report: 'strongly_agree',
};

const random = {
  trainer_clarity: 5,
  sys_search: 5,
  content_relevance: 5,
  attn_trainer_clear: 'strongly_disagree', // inconsistent with trainer_clarity=5
  attn_sys_search: 1,                       // inconsistent with sys_search=5
  attn_bogus_topic: 'strongly_agree',       // agreed with bogus statement
  attn_content_useful: 'disagree',          // inconsistent with content_relevance=5
  attn_self_report: 'strongly_agree',       // straightline; passes self_report
};

const lazy = {
  trainer_clarity: 5,
  sys_search: 5,
  content_relevance: 5,
  attn_trainer_clear: 'agree',           // passes
  attn_sys_search: 4,                     // passes (±1)
  attn_bogus_topic: 'agree',              // fails (bogus)
  attn_content_useful: 'agree',           // passes
  attn_self_report: 'agree',              // passes
};

describe('scoreAttention', () => {
  test('honest responder passes all checks', () => {
    const r = scoreAttention(honest);
    assert.equal(r.checked, 5);
    assert.equal(r.failed, 0);
    assert.equal(r.isSuspect, false);
    assert.deepEqual(r.failedIds, []);
  });

  test('random clicker fails 4 of 5 → marked suspect', () => {
    const r = scoreAttention(random);
    assert.equal(r.checked, 5);
    assert.equal(r.failed, 4);
    assert.equal(r.isSuspect, true);
  });

  test('lazy responder failing only 1 check → not suspect', () => {
    const r = scoreAttention(lazy);
    assert.equal(r.failed, 1);
    assert.equal(r.isSuspect, false);
  });

  test('suspect threshold is 3 failures', () => {
    const failsThree = {
      trainer_clarity: 5,
      sys_search: 5,
      content_relevance: 5,
      attn_trainer_clear: 'strongly_disagree',   // fail
      attn_sys_search: 1,                          // fail
      attn_bogus_topic: 'agree',                   // fail
      attn_content_useful: 'agree',                // pass
      attn_self_report: 'agree',                   // pass
    };
    const r = scoreAttention(failsThree);
    assert.equal(r.failed, 3);
    assert.equal(r.isSuspect, true);
  });

  test('consistency check: neutral pair (3 stars) is permissive', () => {
    const r = scoreAttention({
      trainer_clarity: 3,
      attn_trainer_clear: 'strongly_disagree', // pair is neutral → any answer accepted
    });
    assert.equal(r.failed, 0);
  });

  test('missing trap answers are skipped, not counted as failures', () => {
    const r = scoreAttention({ trainer_clarity: 5 });
    assert.equal(r.checked, 0);
    assert.equal(r.failed, 0);
    assert.equal(r.isSuspect, false);
  });

  test('stars-vs-stars within ±1 is consistent', () => {
    assert.equal(scoreAttention({ sys_search: 5, attn_sys_search: 4 }).failed, 0);
    assert.equal(scoreAttention({ sys_search: 5, attn_sys_search: 3 }).failed, 1);
  });
});
