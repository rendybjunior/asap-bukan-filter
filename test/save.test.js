import test from 'node:test';
import assert from 'node:assert/strict';
import { imageFile, canShareImage, shareImage } from '../dist/save.js';

const pngUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aO1sAAAAASUVORK5CYII=';

test('native sharing receives an actual PNG file with a usable filename', async () => {
  const file = imageFile(pngUrl, 'asap-bukan-filter.png');
  assert.equal(file.name, 'asap-bukan-filter.png');
  assert.equal(file.type, 'image/png');
  const bytes = new Uint8Array(await file.arrayBuffer());
  assert.deepEqual([...bytes.slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  let shared;
  const navigator = { canShare: ({ files }) => files[0] === file, share: async (payload) => { shared = payload; } };
  assert.equal(await shareImage(navigator, file), 'shared');
  assert.deepEqual(shared, { files: [file] });
});

test('browsers without file sharing leave the image-saving fallback available', async () => {
  const file = imageFile(pngUrl, 'photo.png');
  assert.equal(canShareImage({}, file), false);
  assert.equal(canShareImage({ share() {} }, file), false);
  assert.equal(canShareImage({ share() {}, canShare() { throw new Error('Blocked'); } }, file), false);
  let calls = 0;
  assert.equal(await shareImage({ canShare: () => false, share: () => { calls++; } }, file), 'unavailable');
  assert.equal(calls, 0);
});

test('share cancellation is distinguished from security and permission errors', async () => {
  const file = imageFile(pngUrl, 'photo.png');
  for (const [name, expected] of [['AbortError', 'cancelled'], ['NotAllowedError', 'failed'], ['TypeError', 'failed']]) {
    const navigator = { canShare: () => true, share: async () => { throw Object.assign(new Error(name), { name }); } };
    assert.equal(await shareImage(navigator, file), expected);
  }
});

test('sharing is invoked synchronously from the tap, before waiting on its result', async () => {
  const file = imageFile(pngUrl, 'photo.png');
  let called = false;
  let complete;
  const navigator = { canShare: () => true, share: () => { called = true; return new Promise((resolve) => { complete = resolve; }); } };
  const pending = shareImage(navigator, file);
  assert.equal(called, true);
  complete();
  assert.equal(await pending, 'shared');
});

test('non-PNG data is rejected rather than shared under an image filename', () => {
  assert.throws(() => imageFile('data:text/html;base64,SGVsbG8=', 'photo.png'), TypeError);
});
