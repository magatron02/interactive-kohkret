/**
 * Rule 1 applied to the one graphic that makes a promise: the QR code has to be a real code, and the
 * box it is drawn in has to fit it. A hand-drawn lookalike passes every visual review and fails every
 * phone, so this re-derives the grid from the path data and checks the structures a real QR must have.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { QR_PATH, QR_MODULES, QR_TARGET_URL, QR_TARGET_LABEL } from '../lib/qr.ts';

/** The path is runs of dark modules: `M<x> <y>.5h<n>` absolute, `m<dx> <dy>h<n>` relative. */
function decode(path) {
  const dark = new Set();
  let x = 0;
  let y = 0;
  for (const [, cmd, a, b, run] of path.matchAll(/([Mm])([\d.]+) ([\d.]+)h([\d.]+)/g)) {
    if (cmd === 'M') {
      x = Number(a);
      y = Math.floor(Number(b));
    } else {
      x += Number(a);
      y += Number(b);
    }
    for (let i = 0; i < Number(run); i++) dark.add(`${x + i},${y}`);
    x += Number(run);
  }
  const xs = [...dark].map((c) => Number(c.split(',')[0]));
  const ys = [...dark].map((c) => Number(c.split(',')[1]));
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const size = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY) + 1;
  return { size, minX, minY, on: (r, c) => dark.has(`${minX + c},${minY + r}`) };
}

const qr = decode(QR_PATH);

test('the code is a valid QR version', () => {
  // Every QR is 4V+17 modules square, V from 1 to 40. Nothing else is a QR.
  const version = (qr.size - 17) / 4;
  assert.ok(Number.isInteger(version) && version >= 1 && version <= 40, `${qr.size} modules is not a QR size`);
});

test('all three finder patterns are exact', () => {
  const WANT = [
    [1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1],
  ];
  const finderAt = (r0, c0) => WANT.every((row, r) => row.every((want, c) => qr.on(r0 + r, c0 + c) === !!want));
  assert.ok(finderAt(0, 0), 'top-left finder pattern is malformed');
  assert.ok(finderAt(0, qr.size - 7), 'top-right finder pattern is malformed');
  assert.ok(finderAt(qr.size - 7, 0), 'bottom-left finder pattern is malformed');
});

test('both timing patterns alternate', () => {
  for (let i = 8; i < qr.size - 8; i++) {
    assert.equal(qr.on(6, i), i % 2 === 0, `timing row breaks at column ${i}`);
    assert.equal(qr.on(i, 6), i % 2 === 0, `timing column breaks at row ${i}`);
  }
});

test('the mandatory dark module is set', () => {
  assert.ok(qr.on(qr.size - 8, 8), 'the always-dark module is missing');
});

test('the viewBox fits the code plus its quiet zone exactly', () => {
  // Too large and the code sits off-centre in its own card; too small and the quiet zone is clipped,
  // which is what actually stops a scanner locking on.
  assert.equal(qr.minX, 4, 'quiet zone on the left is not 4 modules');
  assert.equal(qr.minY, 4, 'quiet zone on the top is not 4 modules');
  assert.equal(QR_MODULES, qr.size + 8, `QR_MODULES is ${QR_MODULES} but the code needs ${qr.size + 8}`);
});

test('the label matches the URL it encodes', () => {
  assert.match(QR_TARGET_URL, /^https:\/\//);
  assert.ok(QR_TARGET_URL.includes(QR_TARGET_LABEL), `label "${QR_TARGET_LABEL}" is not part of ${QR_TARGET_URL}`);
});
