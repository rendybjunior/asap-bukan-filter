import test from 'node:test';
import assert from 'node:assert/strict';
import { presets, cropRect, applyHaze } from '../dist/effects.js';

test('zero intensity preserves the original including transparent pixels', () => {
  const data = new Uint8ClampedArray([240, 122, 33, 255, 30, 90, 200, 0]);
  const before = data.slice();
  applyHaze(data, 2, 1, presets.orange, 0);
  assert.deepEqual(data, before);
});
test('all four palettes produce distinct results and preserve alpha', () => {
  const outputs = Object.values(presets).map((preset) => {
    const data = new Uint8ClampedArray([32, 100, 180, 200]);
    applyHaze(data, 1, 1, preset, 0.7);
    assert.equal(data[3], 200);
    return [...data].join(',');
  });
  assert.equal(new Set(outputs).size, 4);
});
test('orange shifts neutral pixels toward orange, smoke grey removes most chroma', () => {
  const orange = new Uint8ClampedArray([100, 100, 100, 255]);
  applyHaze(orange, 1, 1, presets.orange, 1);
  assert.ok(orange[0] > orange[1] && orange[1] > orange[2]);
  const grey = new Uint8ClampedArray([255, 0, 0, 255]);
  applyHaze(grey, 1, 1, presets.grey, 1);
  assert.ok(Math.max(...grey.slice(0, 3)) - Math.min(...grey.slice(0, 3)) < 15);
});
test('crop stays inside landscape and portrait images for all supported controls', () => {
  for (const [width, height] of [[4000, 3000], [800, 2400], [1080, 1080]]) {
    for (const zoom of [1, 1.5, 2.5]) {
      for (const panX of [-1, 0, 1]) for (const panY of [-1, 0, 1]) {
        const crop = cropRect(width, height, zoom, panX, panY);
        assert.ok(crop.x >= 0 && crop.y >= 0);
        assert.ok(crop.x + crop.size <= width + 1e-9);
        assert.ok(crop.y + crop.size <= height + 1e-9);
      }
    }
  }
});
test('crop reaches both image edges and zoom changes framing', () => {
  assert.deepEqual(cropRect(400, 200, 1, -1, 0), { x: 0, y: 0, size: 200 });
  assert.deepEqual(cropRect(400, 200, 1, 1, 0), { x: 200, y: 0, size: 200 });
  assert.deepEqual(cropRect(400, 200, 2, 0, 0), { x: 150, y: 50, size: 100 });
});
test('invalid source sizes are rejected', () => {
  assert.throws(() => cropRect(0, 100), RangeError);
  assert.throws(() => cropRect(100, 100, 0.5), RangeError);
});
