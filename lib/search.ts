/**
 * Typo-tolerant matching for the place search box. Plain `.includes()` meant a single wrong character
 * — a missing tone mark, a transposed letter, "resturant" for "restaurant" — returned nothing, on a
 * page with no autocomplete to recover from it. This scores a query against a field instead of just
 * testing membership, so a near-miss still finds the place instead of finding nothing.
 *
 * Plain functions, no dependency on lib/places — kept test-importable the way lib/pin-stack.ts is.
 */

/** Classic edit distance (insert/delete/substitute), case- and whitespace-insensitive by the time it's
 *  called. O(a·b) — fine at this scale (place names, a handful of words each). */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row.push(
        a[i - 1] === b[j - 1]
          ? prev[j - 1]
          : 1 + Math.min(prev[j - 1], prev[j], row[j - 1])
      );
    }
    prev = row;
  }
  return prev[b.length];
}

/** How many edits a query is allowed before a word no longer counts as "close enough" — scales with
 *  length, since one wrong letter in a 4-letter word is a much bigger fraction than in a 12-letter one. */
function tolerance(len: number): number {
  if (len <= 3) return 0;
  if (len <= 6) return 1;
  return 2;
}

/**
 * Scores `query` against `field`. Higher is better; `null` means no match at all. An exact substring
 * always outranks a fuzzy one — a real match should never lose to a near-miss on a different field.
 */
export function fieldScore(query: string, field: string): number | null {
  const q = query.trim().toLowerCase();
  const f = field.toLowerCase();
  if (!q) return null;

  const at = f.indexOf(q);
  if (at !== -1) {
    // Earlier and tighter (query length close to the whole field) scores higher: a match at the start
    // of a short field beats the same query buried in the middle of a long one.
    return 1000 - at - Math.max(0, f.length - q.length);
  }

  // Fuzzy fallback: compare the query against each word in the field, and against the field's own
  // leading substring the same length as the query — catches both "wrong word" and "typo mid-word"
  // without exploding into every possible substring.
  const words = f.split(/\s+/).filter(Boolean);
  const candidates = [...words, f.slice(0, q.length)];
  let best: number | null = null;
  for (const c of candidates) {
    if (!c) continue;
    const d = levenshtein(q, c);
    const allowed = tolerance(Math.min(q.length, c.length));
    if (d <= allowed) {
      const score = 500 - d * 50 - Math.abs(c.length - q.length);
      if (best === null || score > best) best = score;
    }
  }
  return best;
}

/** Best score for `query` across several fields (name, English name, category label, ...) — `null`
 *  fields (unset nameEn, for instance) are skipped rather than treated as an empty-string match. */
export function bestScore(query: string, fields: (string | undefined)[]): number | null {
  let best: number | null = null;
  for (const field of fields) {
    if (!field) continue;
    const s = fieldScore(query, field);
    if (s !== null && (best === null || s > best)) best = s;
  }
  return best;
}
