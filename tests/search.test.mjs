/**
 * lib/search.ts is what stands between a typo and an empty result set. These tests are the contract:
 * exact still wins, near-misses within tolerance still find something, and unrelated words don't.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { fieldScore, bestScore } from '../lib/search.ts';

test('an exact substring always scores higher than any fuzzy match', () => {
  const exact = fieldScore('cafe', 'Rangnok Cafe & Bar');
  const fuzzy = fieldScore('cafee', 'Rangnok Cafe & Bar'); // one extra letter, no longer a substring
  assert.ok(exact !== null && fuzzy !== null, 'both should still match');
  assert.ok(exact > fuzzy, `exact (${exact}) should outrank fuzzy (${fuzzy})`);
});

test('a one-letter typo in a mid-length word still matches', () => {
  assert.ok(fieldScore('templpe', 'temple') !== null, 'transposed letters should still match "temple"');
  assert.ok(fieldScore('cofe', 'Rangnok Cafe & Bar') !== null, 'a single-letter typo should still find "cafe"');
});

test('very short queries require an exact match — fuzzy tolerance is 0 below 4 characters', () => {
  assert.equal(fieldScore('caf', 'bar'), null, 'a 3-letter query should not fuzzy-match an unrelated 3-letter word');
  assert.ok(fieldScore('caf', 'cafe') !== null, 'a 3-letter prefix should still substring-match');
});

test('completely unrelated words do not match', () => {
  assert.equal(fieldScore('homestay', 'วัดปรมัยยิกาวาส'), null);
  assert.equal(fieldScore('pottery', 'restaurant'), null);
});

test('bestScore skips undefined fields and returns the best across the rest', () => {
  assert.equal(bestScore('temple', [undefined, undefined]), null);
  const score = bestScore('temple', [undefined, 'Wat Sao Thong Thong temple']);
  assert.ok(score !== null);
});

test('bestScore prefers the field with the closer match', () => {
  const exactField = bestScore('cafe', ['cafe', 'a place near a cafe somewhere far down the string']);
  assert.ok(exactField !== null);
});

test('an empty query never matches (callers should treat empty as "show everything" themselves)', () => {
  assert.equal(fieldScore('', 'anything'), null);
});
