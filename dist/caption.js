// Wrap words to the available canvas width, splitting long words when needed.
// Use Unicode code points so surrogate pairs are never split in half.
export function wrapCaption(text, measure, maxWidth) {
  const lines = [];
  let current = '';
  for (const word of text.trim().split(/\s+/u).filter(Boolean)) {
    const candidate = current ? `${current} ${word}` : word;
    if (measure(candidate) <= maxWidth) { current = candidate; continue; }
    if (current) lines.push(current);
    current = '';
    for (const letter of word) {
      if (current && measure(current + letter) > maxWidth) {
        lines.push(current);
        current = '';
      }
      current += letter;
    }
  }
  if (current) lines.push(current);
  return lines;
}
