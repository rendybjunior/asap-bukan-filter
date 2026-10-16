import { presets, cropRect, applyDuotone, applySmokeVeil } from './effects.js';

// Share the same crop and effects between the main image and live thumbnails.
export function renderPortrait(canvas, source, {
  paletteId = 'orange', intensity = 0.8, classic = false, reverse = false,
  zoom = 1, panX = 0, panY = 0, original = false,
} = {}) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas is unavailable');
  const { width, height } = canvas;
  const { x, y, size } = cropRect(source.naturalWidth || source.width, source.naturalHeight || source.height, zoom, panX, panY);
  ctx.fillStyle = '#f5f1e8';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source, x, y, size, size, 0, 0, width, height);
  if (!original) {
    const pixels = ctx.getImageData(0, 0, width, height);
    applyDuotone(pixels.data, intensity, { palette: presets[paletteId], classic, reverse });
    if (paletteId === 'grey') applySmokeVeil(pixels.data, width, height, intensity, { classic, reverse });
    ctx.putImageData(pixels, 0, 0);
  }
  return ctx;
}
