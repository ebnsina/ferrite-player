// Storyboard thumbnails for hover seek previews. Parses a WebVTT where each
// cue's payload is an image URL with an optional media fragment
// (`sprite.jpg#xywh=x,y,w,h`) — the format the Ferrite transcoder emits.

export interface Thumb {
  start: number;
  end: number;
  url: string;
  /** Sprite region; all 0 means "use the whole image". */
  x: number;
  y: number;
  w: number;
  h: number;
}

function parseTs(s: string): number {
  const m = s.trim().match(/(?:(\d+):)?(\d{2}):(\d{2})[.,](\d{3})/);
  if (!m) return Number.NaN;
  return +(m[1] ?? 0) * 3600 + +(m[2] ?? 0) * 60 + +(m[3] ?? 0) + +(m[4] ?? 0) / 1000;
}

/** Fetch and parse a WebVTT storyboard into time-sorted thumbnail cues. */
export async function loadThumbnails(vttUrl: string): Promise<Thumb[]> {
  const res = await fetch(vttUrl);
  if (!res.ok) throw new Error(`Thumbnails fetch failed: ${res.status}`);
  const text = await res.text();
  const base = new URL(vttUrl, location.href);
  const cues: Thumb[] = [];

  for (const block of text.replace(/\r/g, '').split('\n\n')) {
    const lines = block.split('\n').filter(Boolean);
    const ti = lines.findIndex((l) => l.includes('-->'));
    if (ti < 0) continue;
    const [from, to] = (lines[ti] as string).split('-->');
    const payload = lines[ti + 1];
    if (!from || !to || !payload) continue;

    const [rawUrl, frag] = payload.trim().split('#');
    let x = 0;
    let y = 0;
    let w = 0;
    let h = 0;
    const xy = frag?.match(/xywh=(?:\w+:)?(\d+),(\d+),(\d+),(\d+)/);
    if (xy) {
      x = +(xy[1] as string);
      y = +(xy[2] as string);
      w = +(xy[3] as string);
      h = +(xy[4] as string);
    }
    cues.push({ start: parseTs(from), end: parseTs(to), url: new URL(rawUrl as string, base).href, x, y, w, h });
  }
  return cues.sort((a, b) => a.start - b.start);
}

/** The thumbnail covering time `t` (falls back to the nearest earlier cue). */
export function thumbAt(cues: Thumb[], t: number): Thumb | null {
  if (!cues.length) return null;
  let hit: Thumb | null = null;
  for (const c of cues) {
    if (t >= c.start && t < c.end) return c;
    if (c.start <= t) hit = c;
  }
  return hit ?? cues[0] ?? null;
}
