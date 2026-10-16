// Each palette maps the full image to two colors. Classic uses a softer pair.
export const presets = Object.freeze({
  orange: { name: 'Apocalyptic orange', number: '01', colorLabel: 'orange', shadowName: 'Burnt orange', highlightName: 'Bright orange', colors: {
    contrast: { shadow: [66, 20, 7], highlight: [255, 145, 35] },
    classic: { shadow: [110, 41, 14], highlight: [255, 177, 73] },
  } },
  grey: { name: 'Industrial smoke grey', number: '02', colorLabel: 'grey', shadowName: 'Charcoal', highlightName: 'Smoke grey', colors: {
    contrast: { shadow: [20, 20, 20], highlight: [230, 230, 230] },
    classic: { shadow: [60, 60, 60], highlight: [195, 195, 195] },
  } },
  ihsg: { name: 'IHSG red', number: '03', colorLabel: 'red', shadowName: 'Deep red', highlightName: 'Bright red', colors: {
    contrast: { shadow: [69, 3, 20], highlight: [255, 58, 77] },
    classic: { shadow: [118, 13, 34], highlight: [255, 104, 116] },
  } },
  pinkGreen: { name: 'Brave pink × Hero green', number: '04', colorLabel: 'pink / green', shadowName: 'Green', highlightName: 'Pink', colors: {
    contrast: { shadow: [22, 80, 39], highlight: [249, 159, 210] },
    classic: { shadow: [27, 96, 47], highlight: [247, 132, 197] },
  } },
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Square crop in source pixels. Position -1 / +1 reaches the corresponding edge.
export function cropRect(width, height, zoom = 1, panX = 0, panY = 0) {
  if (!(width > 0 && height > 0 && zoom >= 1)) throw new RangeError('Invalid image dimensions or zoom');
  const size = Math.min(width, height) / zoom;
  return { x: (width - size) * (clamp(panX, -1, 1) + 1) / 2,
    y: (height - size) * (clamp(panY, -1, 1) + 1) / 2, size };
}

// Stretch the visible luminance range, shape contrast, then map it between two
// colors. Intensity blends that result with a grayscale base; transparent pixels do
// not influence the image's tonal range.
export function applyDuotone(data, intensity = 1, { classic = false, reverse = false, palette = presets.pinkGreen } = {}) {
  const amount = clamp(intensity, 0, 1);
  let darkest = Infinity;
  let lightest = -Infinity;
  const luminance = (i) => data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
  for (let i = 0; i < data.length; i += 4) {
    if (!data[i + 3]) continue;
    const light = luminance(i);
    darkest = Math.min(darkest, light);
    lightest = Math.max(lightest, light);
  }
  const pair = palette.colors[classic ? 'classic' : 'contrast'];
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
      data[i + channel] = Math.round(light * (1 - amount) + mapped * amount);
    }
  }
  return data;
}
