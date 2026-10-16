import { presets, cropRect, applyHaze, applyDuotone } from './effects.js';

const $ = (id) => document.getElementById(id);
const canvas = $('preview');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
let source = null;
let uploaded = false;
let selected = 'orange';
let original = false;
let loadVersion = 0;
let renderFrame = 0;
let downloading = false;
let hazeIntensity = '70';
let duotoneIntensity = '100';
const caption = 'Asap bukan filter. Udara bersih itu hak. Foto profil ini adalah pengingat: karhutla belum usai. Mari terus peduli pada hutan, lahan, dan udara kita. #AsapBukanFilter #Karhutla';

function status(message = '', error = false) {
  $('status').textContent = message;
  $('status').classList.toggle('error', error);
}

function render() {
  if (!source || !ctx) return;
  const { x, y, size } = cropRect(source.naturalWidth, source.naturalHeight,
    Number($('zoom').value) / 100, Number($('pan-x').value) / 100, Number($('pan-y').value) / 100);
  ctx.fillStyle = '#f5f1e8';
  ctx.fillRect(0, 0, 1080, 1080);
  ctx.drawImage(source, x, y, size, size, 0, 0, 1080, 1080);
  if (!original) {
    const pixels = ctx.getImageData(0, 0, 1080, 1080);
    const intensity = Number($('intensity').value) / 100;
    if (presets[selected].type === 'duotone') {
      applyDuotone(pixels.data, intensity, {
        classic: $('classic-colors').checked,
        reverse: $('reverse-duotone').checked,
      });
    } else {
      applyHaze(pixels.data, 1080, 1080, presets[selected], intensity);
    }
    ctx.putImageData(pixels, 0, 0);
    if ($('message').checked) {
      // Keep the campaign line within a circular profile crop's safe area.
      ctx.fillStyle = '#272822';
      ctx.fillRect(100, 820, 880, 92);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f5f1e8';
      ctx.font = 'bold 43px Arial, sans-serif';
      ctx.fillText('KARHUTLA BELUM USAI', 540, 881, 825);
      ctx.fillStyle = '#f5f1e8';
      ctx.font = '19px monospace';
      ctx.fillText('#AsapBukanFilter', 540, 948);
    }
  }
}

function scheduleRender() {
  cancelAnimationFrame(renderFrame);
  renderFrame = requestAnimationFrame(render);
}

function setOriginal(value) {
  original = value;
  $('compare').setAttribute('aria-pressed', String(value));
  $('compare').textContent = value ? '◐ Back to effect' : '◐ View original';
  $('image-chip').textContent = value ? 'ORIGINAL / NO EFFECT' : `${presets[selected].number} / ${presets[selected].name.toUpperCase()}`;
}

function resetCrop() {
  $('zoom').value = '100';
  $('pan-x').value = '0';
  $('pan-y').value = '0';
}

async function loadFile(file) {
  if (!file) return;
  const version = ++loadVersion;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    status('Please choose a JPG, PNG or WebP image. For HEIC photos, export a JPG first.', true);
    $('upload').value = '';
    return;
  }
  if (file.size > 20 * 1024 * 1024) {
    status('This image is over 20 MB. Please choose a smaller photo.', true);
    $('upload').value = '';
    return;
  }
  const objectUrl = URL.createObjectURL(file);
  $('download').disabled = true;
  status('Opening your photo on this device…');
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    if (version !== loadVersion) return;
    if (image.naturalWidth * image.naturalHeight > 50_000_000) throw new Error('size');
    source = image;
    uploaded = true;
    resetCrop();
    setOriginal(false);
    $('preview-label').textContent = 'YOUR PHOTO / YOUR VOICE';
    canvas.setAttribute('aria-label', 'Your uploaded photo with the selected haze effect. Use View original to compare.');
    $('download-help').textContent = '1080 × 1080 PNG · Ready for your profile';
    render();
    status('Your photo is ready. Pick a palette and make it yours.');
  } catch (error) {
    if (version === loadVersion) status(error.message === 'size' ? 'Please resize this photo to under 50 megapixels and try again.' : 'This image could not be opened. Try another JPG, PNG or WebP.', true);
  } finally {
    URL.revokeObjectURL(objectUrl);
    if (version === loadVersion) {
      $('download').disabled = !uploaded || downloading;
      $('upload').value = '';
    }
  }
}

$('upload').addEventListener('change', (event) => loadFile(event.target.files[0]));
let dragDepth = 0;
const dropzone = $('dropzone');
dropzone.addEventListener('dragenter', (event) => { event.preventDefault(); dragDepth++; dropzone.classList.add('dragging'); });
dropzone.addEventListener('dragover', (event) => event.preventDefault());
dropzone.addEventListener('dragleave', () => { if (--dragDepth <= 0) dropzone.classList.remove('dragging'); });
dropzone.addEventListener('drop', (event) => {
  event.preventDefault();
  dragDepth = 0;
  dropzone.classList.remove('dragging');
  loadFile(event.dataTransfer.files[0]);
});

document.querySelectorAll('[data-preset]').forEach((button) => button.addEventListener('click', () => {
  if (presets[selected].type === 'duotone') duotoneIntensity = $('intensity').value;
  else hazeIntensity = $('intensity').value;
  selected = button.dataset.preset;
  const duotone = presets[selected].type === 'duotone';
  $('duotone-options').hidden = !duotone;
  $('intensity-label').textContent = duotone ? 'Duotone intensity' : 'Haze intensity';
  $('intensity').value = duotone ? duotoneIntensity : hazeIntensity;
  $('intensity-value').value = `${$('intensity').value}%`;
  $('preview-note').textContent = `An artistic ${duotone ? 'duotone' : 'haze'} effect, not a simulation of air quality.`;
  document.querySelectorAll('[data-preset]').forEach((item) => {
    const active = item === button;
    item.classList.toggle('selected', active);
    item.setAttribute('aria-pressed', String(active));
  });
  setOriginal(false);
  scheduleRender();
}));
function updateDuotoneOptions() {
  const classic = $('classic-colors').checked;
  const reverse = $('reverse-duotone').checked;
  $('classic-description').textContent = classic ? 'Original pink / green shades' : 'Higher-contrast pink / green';
  $('reverse-description').textContent = reverse ? 'Pink shadows, green highlights' : 'Green shadows, pink highlights';
  $('duotone-swatch').classList.toggle('classic', classic);
  $('duotone-swatch').classList.toggle('reversed', reverse);
  setOriginal(false);
  scheduleRender();
}
['classic-colors', 'reverse-duotone'].forEach((id) => $(id).addEventListener('change', updateDuotoneOptions));
$('intensity').addEventListener('input', () => {
  $('intensity-value').value = `${$('intensity').value}%`;
  setOriginal(false);
  scheduleRender();
});
['zoom', 'pan-x', 'pan-y'].forEach((id) => $(id).addEventListener('input', scheduleRender));
$('message').addEventListener('change', scheduleRender);
$('guide').addEventListener('change', () => { $('circle-guide').hidden = !$('guide').checked; });
$('compare').addEventListener('click', () => { setOriginal(!original); scheduleRender(); });
$('reset-crop').addEventListener('click', () => { resetCrop(); scheduleRender(); });

$('download').addEventListener('click', () => {
  if (!uploaded || downloading) return;
  downloading = true;
  $('download').disabled = true;
  // Exports always include the chosen effect, even when comparing with the original.
  setOriginal(false);
  render();
  const effectName = selected === 'pinkGreen'
    ? `pink-green-${$('classic-colors').checked ? 'classic' : 'contrast'}${$('reverse-duotone').checked ? '-reversed' : ''}`
    : selected;
  canvas.toBlob((blob) => {
    try {
      if (!blob) throw new Error('Export failed');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `asap-bukan-filter-${effectName}.png`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      status('Your PNG is ready. Check your downloads, then set it as your profile picture.');
    } catch {
      status('The download could not be prepared. Please try again.', true);
    } finally {
      downloading = false;
      $('download').disabled = !uploaded;
    }
  }, 'image/png');
});

$('copy-caption').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(caption);
    $('copy-caption').textContent = 'Caption copied ✓';
    setTimeout(() => { $('copy-caption').textContent = 'Copy a campaign caption ↗'; }, 3000);
  } catch {
    $('caption-text').value = caption;
    $('caption-dialog').showModal();
    $('caption-text').select();
  }
});
$('privacy-open').addEventListener('click', () => $('privacy-dialog').showModal());
$('privacy-close').addEventListener('click', () => $('privacy-dialog').close());
$('caption-close').addEventListener('click', () => $('caption-dialog').close());

const demo = new Image();
const demoVersion = loadVersion;
demo.onload = () => { if (!uploaded && loadVersion === demoVersion) { source = demo; render(); } };
demo.onerror = () => status('The illustrated demo could not load. Upload a photo to begin.', true);
demo.src = 'demo.svg';
if (!ctx) {
  status('Your browser does not support the photo editor. Please try a recent version of Chrome, Safari, Firefox or Edge.', true);
  $('upload').disabled = true;
}
