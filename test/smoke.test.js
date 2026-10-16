import test from 'node:test';
import assert from 'node:assert/strict';
import { applySmokeVeil } from '../dist/effects.js';

const flat = (width, height, value = 90) => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set([value, value, value, 255], i);
  return data;
};

test('clouds vary across a flat image and keep the face area clearer', () => {
  const width = 100;
  const data = flat(width, width);
  applySmokeVeil(data, width, width, 0.8);
  const values = new Set();
  let center = 0, edges = 0, centers = 0, edgeCount = 0;
  for (let y = 0; y < width; y++) for (let x = 0; x < width; x++) {
    const value = data[(y * width + x) * 4];
    values.add(value);
    if (x > 40 && x < 60 && y > 33 && y < 53) { center += value - 90; centers++; }
    if (x < 15 || x > 85 || y < 15 || y > 85) { edges += value - 90; edgeCount++; }
  }
  assert.ok(values.size > 20);
  assert.ok(center / centers < (edges / edgeCount) * 0.5);
});

test('preview and export clouds are deterministic, with preserved alpha and no color leaks', () => {
  const a = flat(40, 40);
  a.set([20, 30, 40, 0]);
  a[7] = 128;
  const b = a.slice();
  applySmokeVeil(a, 40, 40, 0.8);
  applySmokeVeil(b, 40, 40, 0.8);
  assert.deepEqual(a, b);
  assert.deepEqual([...a.slice(0, 4)], [20, 30, 40, 0]);
  assert.equal(a[7], 128);
  for (let i = 4; i < a.length; i += 4) {
    assert.equal(a[i], a[i + 1]);
    assert.equal(a[i], a[i + 2]);
  }
});

test('classic softens the clouds, reverse darkens them, and zero adds no veil', () => {
  const source = flat(40, 40);
  const full = source.slice(), classic = source.slice(), reverse = source.slice(), zero = source.slice();
  applySmokeVeil(full, 40, 40, 0.8);
  applySmokeVeil(classic, 40, 40, 0.8, { classic: true });
  applySmokeVeil(reverse, 40, 40, 0.8, { reverse: true });
  applySmokeVeil(zero, 40, 40, 0);
  assert.deepEqual(zero, source);
  const brightness = (image) => image.reduce((sum, value, i) => sum + (i % 4 === 0 ? value : 0), 0);
  assert.ok(brightness(full) > brightness(classic));
  assert.ok(brightness(classic) > brightness(source));
  assert.ok(brightness(reverse) < brightness(source));
});
