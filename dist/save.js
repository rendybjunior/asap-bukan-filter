// A real image element remains available even when an embedded browser refuses
// downloads. File sharing is optional and triggered by a separate user tap.
export function imageFile(dataUrl, filename) {
  if (!dataUrl.startsWith('data:image/png;base64,')) throw new TypeError('Expected a PNG image');
  if (typeof File === 'undefined') return null;
  const binary = atob(dataUrl.slice('data:image/png;base64,'.length));
  const bytes = Uint8Array.from(binary, (letter) => letter.charCodeAt(0));
  return new File([bytes], filename, { type: 'image/png' });
}

export function canShareImage(navigator, file) {
  if (!file || typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return false;
  try { return navigator.canShare({ files: [file] }); } catch { return false; }
}

export async function shareImage(navigator, file) {
  if (!canShareImage(navigator, file)) return 'unavailable';
  try {
    await navigator.share({ files: [file] });
    return 'shared';
  } catch (error) {
    return error?.name === 'AbortError' ? 'cancelled' : 'failed';
  }
}
