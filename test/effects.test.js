import test from 'node:test';
import assert from 'node:assert/strict';
import { presets, cropRect, applyHaze, applyDuotone, duotoneColors } from '../dist/effects.js';

test('zero intensity preserves the original including transparent pixels', () => {
  const data = new Uint8ClampedArray([240, 122, 33, 255, 30, 90, 200, 0]);
  const before = data.slice();
  applyHaze(data, 2, 1, presets.orange, 0);
  assert.deepEqual(data, before);
});
test('all haze palettes produce distinct results and preserve alpha', () => {
  const outputs = Object.values(presets).filter((preset) => preset.type !== 'duotone').map((preset) => {
    const data = new Uint8ClampedArray([32, 100, 180, 200]);
    applyHaze(data, 1, 1, preset, 0.7);
    assert.equal(data[3], 200);
    return [...data].join(',');
  });
  assert.equal(new Set(outputs).size, 3);
});
test('warm palettes shift neutral pixels to their colors, smoke grey removes most chroma', () => {
  const orange = new Uint8ClampedArray([100, 100, 100, 255]);
  applyHaze(orange, 1, 1, presets.orange, 1);
  assert.ok(orange[0] > orange[1] && orange[1] > orange[2]);
  const red = new Uint8ClampedArray([100, 100, 100, 255]);
  applyHaze(red, 1, 1, presets.ihsg, 1);
  assert.ok(red[0] > red[1] * 2 && red[0] > red[2] * 2);
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

const ramp = () => new Uint8ClampedArray([0, 0, 0, 255, 128, 128, 128, 128, 255, 255, 255, 255]);

test('duotone maps black and white to each reference color pair', () => {
  for (const classic of [false, true]) {
    const data = ramp();
    applyDuotone(data, 1, { classic });
    const pair = duotoneColors[classic ? 'classic' : 'contrast'];
    assert.deepEqual([...data.slice(0, 3)], pair.shadow);
    assert.deepEqual([...data.slice(8, 11)], pair.highlight);
    assert.equal(data[7], 128);
  }
});

test('reverse duotone swaps shadows and highlights in both color modes', () => {
  for (const classic of [false, true]) {
    const data = ramp();
    applyDuotone(data, 1, { classic, reverse: true });
    const pair = duotoneColors[classic ? 'classic' : 'contrast'];
    assert.deepEqual([...data.slice(0, 3)], pair.highlight);
    assert.deepEqual([...data.slice(8, 11)], pair.shadow);
  }
});

test('duotone zero intensity preserves source and partial intensity blends', () => {
  const before = ramp();
  const zero = before.slice();
  applyDuotone(zero, 0, { reverse: true });
  assert.deepEqual(zero, before);
  const full = before.slice();
  const half = before.slice();
  applyDuotone(full);
  applyDuotone(half, 0.5);
  for (let i = 0; i < before.length; i++) {
    if (i % 4 === 3) assert.equal(half[i], before[i]);
    else assert.ok(Math.abs(half[i] - (before[i] + full[i]) / 2) <= 1);
  }
});

test('duotone stretches narrow tonal ranges and ignores transparent outliers', () => {
  const data = new Uint8ClampedArray([255, 255, 255, 0, 90, 90, 90, 255, 120, 120, 120, 255]);
  applyDuotone(data);
  assert.deepEqual([...data.slice(0, 4)], [255, 255, 255, 0]);
  assert.deepEqual([...data.slice(4, 7)], duotoneColors.contrast.shadow);
  assert.deepEqual([...data.slice(8, 11)], duotoneColors.contrast.highlight);
});

test('flat and fully transparent images remain valid through duotone processing', () => {
  const transparent = new Uint8ClampedArray([10, 20, 30, 0]);
  const before = transparent.slice();
  applyDuotone(transparent);
  assert.deepEqual(transparent, before);
  const flat = new Uint8ClampedArray([128, 128, 128, 255]);
  applyDuotone(flat);
  assert.ok(flat[0] > duotoneColors.contrast.shadow[0]);
  assert.ok(flat[0] < duotoneColors.contrast.highlight[0]);
  assert.equal(flat[3], 255);
});
