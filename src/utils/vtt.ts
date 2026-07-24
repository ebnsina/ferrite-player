// Minimal WebVTT helpers shared by the thumbnail and chapter parsers.

/** Parse a `HH:MM:SS.mmm` (or `MM:SS.mmm`, comma or dot) timestamp to seconds. */
export function parseTimestamp(s: string): number {
  const m = s.trim().match(/(?:(\d+):)?(\d{2}):(\d{2})[.,](\d{3})/);
  if (!m) return Number.NaN;
  return +(m[1] ?? 0) * 3600 + +(m[2] ?? 0) * 60 + +(m[3] ?? 0) + +(m[4] ?? 0) / 1000;
}

/** Split raw VTT text into cue blocks, each a list of non-empty lines. */
export function vttBlocks(text: string): string[][] {
  return text
    .replace(/\r/g, '')
    .split('\n\n')
    .map((b) => b.split('\n').filter(Boolean))
    .filter((lines) => lines.some((l) => l.includes('-->')));
}
