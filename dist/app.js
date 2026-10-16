import { presets } from './effects.js';
import { renderPortrait } from './portrait.js';
import { wrapCaption } from './caption.js';
import { imageFile, canShareImage, shareImage } from './save.js';

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
let preparedImage = null;
const caption = 'Asap bukan filter. Udara bersih itu hak. Foto profil ini adalah pengingat: karhutla belum usai. Mari terus peduli pada hutan, lahan, dan udara kita. #AsapBukanFilter #Karhutla';

function status(message = '', error = false) {
  $('status').textContent = message;
  $('status').classList.toggle('error', error);
}

function render() {
  if (!source || !ctx) return;
  const options = {
    paletteId: selected,
    intensity: Number($('intensity').value) / 100,
    classic: $('classic-colors').checked,
    reverse: $('reverse-duotone').checked,
    zoom: Number($('zoom').value) / 100,
    panX: Number($('pan-x').value) / 100,
    panY: Number($('pan-y').value) / 100,
  };
  renderPortrait(canvas, source, { ...options, original });
  document.querySelectorAll('[data-preview]').forEach((thumbnail) => {
    renderPortrait(thumbnail, source, { ...options, paletteId: thumbnail.dataset.preview });
  });
  if (!original) {
    const message = $('message-text').value.trim();
    if ($('message').checked && message) {
      let fontSize = 43;
      let lines;
      do {
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        lines = wrapCaption(message, (text) => ctx.measureText(text).width, 790);
        if (lines.length <= 2 || fontSize <= 25) break;
        fontSize -= 2;
      } while (true);
      const lineHeight = fontSize * 1.25;
      const bannerHeight = lines.length * lineHeight + 32;
      ctx.fillStyle = '#272822';
      ctx.fillRect(100, 800, 880, bannerHeight);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#f5f1e8';
      lines.forEach((line, index) => ctx.fillText(line, 540, 816 + lineHeight * (index + 0.5), 790));
      ctx.textBaseline = 'alphabetic';
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
    canvas.setAttribute('aria-label', 'Your uploaded photo with the selected duotone effect. Use View original to compare.');
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
  selected = button.dataset.preset;
  updateDuotoneOptions();
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
  const palette = presets[selected];
  $('classic-description').textContent = selected === 'grey'
    ? (classic ? 'Softer charcoal and lighter smoke' : 'Deeper charcoal and denser smoke')
    : `${classic ? 'Original' : 'Higher-contrast'} ${palette.colorLabel} shades`;
  const shadow = reverse ? palette.highlightName : palette.shadowName;
  const highlight = reverse ? palette.shadowName : palette.highlightName;
  $('reverse-description').textContent = selected === 'grey'
    ? (reverse ? 'Dark smoke over reversed tones' : 'Light smoke over charcoal tones')
    : `${shadow} shadows, ${highlight.toLowerCase()} highlights`;
  $('intensity-label').textContent = selected === 'grey' ? 'Smoke intensity' : 'Duotone intensity';
  $('preview-note').textContent = selected === 'grey'
    ? 'Soft smoke with a clearer center. An artistic effect, not a simulation of air quality.'
    : 'An artistic duotone effect, not a simulation of air quality.';
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
$('message').addEventListener('change', () => {
  $('custom-message').hidden = !$('message').checked;
  setOriginal(false);
  scheduleRender();
});
$('message-text').addEventListener('input', () => { setOriginal(false); scheduleRender(); });
$('guide').addEventListener('change', () => { $('circle-guide').hidden = !$('guide').checked; });
$('compare').addEventListener('click', () => { setOriginal(!original); scheduleRender(); });
$('reset-crop').addEventListener('click', () => { resetCrop(); scheduleRender(); });

$('download').addEventListener('click', () => {
  if (!uploaded || downloading) return;
  downloading = true;
  $('download').disabled = true;
  try {
    // Exports include the chosen effect even while comparing with the original.
    setOriginal(false);
    render();
    const effectName = `${presets[selected].slug}-${$('classic-colors').checked ? 'classic' : 'contrast'}${$('reverse-duotone').checked ? '-reversed' : ''}`;
    const filename = `asap-bukan-filter-${effectName}.png`;
    const dataUrl = canvas.toDataURL('image/png');
    preparedImage = null;
    // Missing file-sharing support must never prevent the image fallback.
    try { preparedImage = imageFile(dataUrl, filename); } catch { /* Use the image and download link. */ }
    $('save-image').src = dataUrl;
    $('save-download').href = dataUrl;
    $('save-download').download = filename;
    $('save-share').hidden = !canShareImage(navigator, preparedImage);
    $('save-status').textContent = '';
    $('save-dialog').showModal();
    status('Your image is ready. Choose how to save it in the preview.');
  } catch {
    status('The image could not be prepared. Please try again.', true);
  } finally {
    downloading = false;
    $('download').disabled = !uploaded;
  }
});

$('save-share').addEventListener('click', async () => {
  $('save-share').disabled = true;
  const result = await shareImage(navigator, preparedImage);
  $('save-share').disabled = false;
  $('save-status').textContent = {
    shared: 'Share menu closed. Your device handles saving; you can also touch and hold the image below.',
    cancelled: 'Sharing cancelled. You can still download or touch and hold the image.',
    unavailable: 'Sharing is not available here. Try downloading or touch and hold the image.',
    failed: 'This browser blocked sharing. Try downloading or touch and hold the image. If needed, open this page in Safari or Chrome.',
  }[result];
});
$('save-download').addEventListener('click', () => {
  $('save-status').textContent = 'Download requested. If nothing happens, touch and hold the image to see your save options.';
});
$('save-close').addEventListener('click', () => $('save-dialog').close());
$('save-dialog').addEventListener('close', () => {
  $('save-image').removeAttribute('src');
  $('save-download').removeAttribute('href');
  preparedImage = null;
});
$('save-copy-link').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('save-page-link').value);
    $('save-status').textContent = 'Page link copied. Paste it into Safari or Chrome. You may need to upload your photo again.';
  } catch {
    $('save-page-link').focus();
    $('save-page-link').select();
    $('save-status').textContent = 'Select and copy the page link, then paste it into Safari or Chrome.';
  }
});
$('save-page-link').value = window.location.href.split('#')[0].split('?')[0];

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
