// Chapter markers parsed from a WebVTT file (cue payload = chapter title).
import { parseTimestamp, vttBlocks } from './vtt';

export interface Chapter {
  start: number;
  end: number;
  title: string;
}

/** Fetch and parse a WebVTT chapters file into time-sorted chapters. */
export async function loadChapters(url: string): Promise<Chapter[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Chapters fetch failed: ${res.status}`);
  return parseChapters(await res.text());
}

/** Parse WebVTT chapter text (exposed for testing). */
export function parseChapters(text: string): Chapter[] {
  const out: Chapter[] = [];
  for (const lines of vttBlocks(text)) {
    const ti = lines.findIndex((l) => l.includes('-->'));
    const [from, to] = (lines[ti] as string).split('-->');
    if (!from || !to) continue;
    const title =
      lines
        .slice(ti + 1)
        .join(' ')
        .trim() || `Chapter ${out.length + 1}`;
    out.push({ start: parseTimestamp(from), end: parseTimestamp(to), title });
  }
  return out.sort((a, b) => a.start - b.start);
}

/** The chapter covering time `t`, or null. */
export function chapterAt(chapters: Chapter[], t: number): Chapter | null {
  let hit: Chapter | null = null;
  for (const c of chapters) if (c.start <= t) hit = c;
  return hit;
}
