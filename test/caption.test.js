import test from 'node:test';
import assert from 'node:assert/strict';
import { wrapCaption } from '../dist/caption.js';

test('custom captions wrap at words and respect available width', () => {
  const lines = wrapCaption('KARHUTLA BELUM USAI', (text) => text.length, 12);
  assert.deepEqual(lines, ['KARHUTLA', 'BELUM USAI']);
  assert.ok(lines.every((line) => line.length <= 12));
});

test('long words wrap and Unicode code points are kept intact', () => {
  const lines = wrapCaption('🔥🔥🔥🔥🔥', (text) => [...text].length, 2);
  assert.deepEqual(lines, ['🔥🔥', '🔥🔥', '🔥']);
  assert.deepEqual(wrapCaption('abcdefghijkl', (text) => text.length, 5), ['abcde', 'fghij', 'kl']);
});

test('blank captions draw no lines and whitespace is normalized', () => {
  assert.deepEqual(wrapCaption('  \n ', (text) => text.length, 20), []);
  assert.deepEqual(wrapCaption('  my   own\nmessage ', (text) => text.length, 20), ['my own message']);
});
