// Each palette maps the full image to two colors. Classic uses a softer pair.
export const presets = Object.freeze({
  orange: { name: 'Apocalyptic orange', number: '01', colorLabel: 'orange', shadowName: 'Burnt orange', highlightName: 'Bright orange', colors: {
    contrast: { shadow: [66, 20, 7], highlight: [255, 145, 35] },
    classic: { shadow: [110, 41, 14], highlight: [255, 177, 73] },
  } },
  grey: { name: 'Smoke veil', number: '02', colorLabel: 'grey', shadowName: 'Charcoal', highlightName: 'Smoke grey', colors: {
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

const smooth = (value) => value * value * (3 - 2 * value);
function noise(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smooth(x - ix);
  const fy = smooth(y - iy);
  const hash = (a, b) => {
    let value = Math.imul(a, 374761393) + Math.imul(b, 668265263) + 1376312589;
    value = Math.imul(value ^ (value >>> 13), 1274126177);
    return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
  };
  const top = hash(ix, iy) * (1 - fx) + hash(ix + 1, iy) * fx;
  const bottom = hash(ix, iy + 1) * (1 - fx) + hash(ix + 1, iy + 1) * fx;
  return top * (1 - fy) + bottom * fy;
}

// Small, cached, smoothly sampled density field: deterministic across preview
// redraws and downloads. Domain warping gives the cloud edges an organic shape.
const smokeSize = 192;
let smokeField;
function smokeDensity() {
  if (smokeField) return smokeField;
  smokeField = new Float32Array(smokeSize * smokeSize);
  for (let y = 0; y < smokeSize; y++) for (let x = 0; x < smokeSize; x++) {
    const u = x / (smokeSize - 1);
    const v = y / (smokeSize - 1);
    const wx = u * 4.5 + noise(u * 2.5 + 13, v * 2.5 + 7) * 2.2;
    const wy = v * 4.5 + noise(u * 2.5 + 5, v * 2.5 + 19) * 2.2;
    const cloud = noise(wx, wy) * 0.57 + noise(wx * 2, wy * 2) * 0.27 + noise(wx * 4, wy * 4) * 0.11 + noise(wx * 8, wy * 8) * 0.05;
    const centralOpening = Math.exp(-1.5 * (((u - 0.5) / 0.25) ** 2 + ((v - 0.43) / 0.32) ** 2));
    smokeField[y * smokeSize + x] = clamp((cloud - 0.24) * 2.1, 0, 1) * (1 - centralOpening * 0.88);
  }
  return smokeField;
}

// Add neutral smoke after duotone, before any optional caption. This is a visual
// overlay with a clearer central area, not face detection or an air-quality model.
export function applySmokeVeil(data, width, height, intensity, { classic = false, reverse = false } = {}) {
  if (width < 1 || height < 1 || data.length !== width * height * 4) throw new RangeError('Invalid smoke image');
  const amount = clamp(intensity, 0, 1);
  if (!amount) return data;
  const field = smokeDensity();
  const smokeColor = reverse ? 34 : 222;
  const strength = amount * (classic ? 0.52 : 0.82);
  for (let y = 0; y < height; y++) {
    const fy = (y / Math.max(1, height - 1)) * (smokeSize - 1);
    const top = Math.min(smokeSize - 2, Math.floor(fy));
    const dy = fy - top;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (!data[i + 3]) continue;
      const fx = (x / Math.max(1, width - 1)) * (smokeSize - 1);
      const left = Math.min(smokeSize - 2, Math.floor(fx));
      const dx = fx - left;
      const row = top * smokeSize + left;
      const density = (field[row] * (1 - dx) + field[row + 1] * dx) * (1 - dy)
        + (field[row + smokeSize] * (1 - dx) + field[row + smokeSize + 1] * dx) * dy;
      const opacity = density * strength;
      for (let channel = 0; channel < 3; channel++) {
        data[i + channel] = Math.round(data[i + channel] * (1 - opacity) + smokeColor * opacity);
      }
    }
  }
  return data;
}
