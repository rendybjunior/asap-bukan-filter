export const presets = Object.freeze({
  orange: { name: 'Apocalyptic orange', number: '01', tint: [247, 133, 41], saturation: 0.38, haze: 0.38 },
  grey: { name: 'Industrial smoke grey', number: '02', tint: [166, 172, 165], saturation: 0.03, haze: 0.49 },
  peat: { name: 'Peatland sepia', number: '03', tint: [183, 151, 99], saturation: 0.18, haze: 0.4 },
  ash: { name: 'Afterburn blue', number: '04', tint: [147, 173, 185], saturation: 0.12, haze: 0.43 },
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
