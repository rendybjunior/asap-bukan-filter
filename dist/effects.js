export const presets = Object.freeze({
  orange: { name: 'Apocalyptic orange', number: '01', tint: [247, 133, 41], saturation: 0.38, haze: 0.38 },
  grey: { name: 'Industrial smoke grey', number: '02', tint: [166, 172, 165], saturation: 0.03, haze: 0.49 },
  ihsg: { name: 'IHSG red', number: '03', tint: [220, 34, 52], saturation: 0.08, haze: 0.44 },
  pinkGreen: { name: 'Brave pink × Hero green', number: '04', type: 'duotone' },
});

// Color pairs observed in the user-provided Brave Pink Hero Green reference.
export const duotoneColors = Object.freeze({
  contrast: { shadow: [22, 80, 39], highlight: [249, 159, 210] },
  classic: { shadow: [27, 96, 47], highlight: [247, 132, 197] },
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Square crop in source pixels. Position -1 / +1 reaches the corresponding edge.
export function cropRect(width, height, zoom = 1, panX = 0, panY = 0) {
  if (!(width > 0 && height > 0 && zoom >= 1)) throw new RangeError('Invalid image dimensions or zoom');
  const size = Math.min(width, height) / zoom;
  return { x: (width - size) * (clamp(panX, -1, 1) + 1) / 2,
    y: (height - size) * (clamp(panY, -1, 1) + 1) / 2, size };
}

// Blend desaturation, a warm/cool cast and a low-contrast atmospheric veil.
// Zero intensity is an exact identity; alpha is always preserved.
export function applyHaze(data, width, height, preset, intensity) {
  const amount = clamp(intensity, 0, 1);
  if (amount === 0) return data;
  if (!preset || data.length !== width * height * 4) throw new RangeError('Invalid haze input');
  for (let y = 0; y < height; y++) {
    const veil = (preset.haze + 0.11 * (1 - y / height)) * amount;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const luma = data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
      const saturation = 1 - (1 - preset.saturation) * amount;
      for (let channel = 0; channel < 3; channel++) {
        const desaturated = luma + (data[i + channel] - luma) * saturation;
        const toned = desaturated * (1 - amount * 0.24) + preset.tint[channel] * amount * 0.24;
        data[i + channel] = toned * (1 - veil) + preset.tint[channel] * veil;
      }
    }
  }
  return data;
}

// Stretch the visible luminance range, shape contrast, then map it between two
// colors. Intensity blends that result with the source; transparent pixels do
// not influence the image's tonal range. This is separate from atmospheric haze.
export function applyDuotone(data, intensity = 1, { classic = false, reverse = false } = {}) {
  const amount = clamp(intensity, 0, 1);
  if (amount === 0) return data;
  let darkest = Infinity;
  let lightest = -Infinity;
  const luminance = (i) => data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
  for (let i = 0; i < data.length; i += 4) {
    if (!data[i + 3]) continue;
    const light = luminance(i);
    darkest = Math.min(darkest, light);
    lightest = Math.max(lightest, light);
  }
  const pair = duotoneColors[classic ? 'classic' : 'contrast'];
  const shadow = reverse ? pair.highlight : pair.shadow;
  const highlight = reverse ? pair.shadow : pair.highlight;
  const span = lightest - darkest;
  for (let i = 0; i < data.length; i += 4) {
    if (!data[i + 3]) continue;
    const light = luminance(i);
    const normalized = clamp(span > 0 ? (light - darkest) / span : light / 255, 0, 1);
    const tone = normalized < 0.5
      ? 0.5 * (2 * normalized) ** 1.8
      : 1 - 0.5 * (2 * (1 - normalized)) ** 1.8;
    for (let channel = 0; channel < 3; channel++) {
      const mapped = shadow[channel] + (highlight[channel] - shadow[channel]) * tone;
      data[i + channel] = Math.round(data[i + channel] * (1 - amount) + mapped * amount);
    }
  }
  return data;
}
