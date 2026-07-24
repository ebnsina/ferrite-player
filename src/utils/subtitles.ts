// Side-loaded subtitle handling. Browsers only render WebVTT natively and
// Shaka's parsers vary by format, so we normalise SubRip (.srt) to WebVTT
// ourselves — that way VTT *and* SRT work identically on both engines.

/** Convert SubRip (.srt) text to an equivalent WebVTT string. */
export function srtToVtt(srt: string): string {
  const body = srt
    .replace(/^﻿/, '') // strip BOM
    .replace(/\r+/g, '')
    // SRT uses a comma before milliseconds; VTT uses a dot.
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
    .trim();
  return `WEBVTT\n\n${body}\n`;
}

const isSrt = (url: string, kind?: string): boolean => kind === 'srt' || /\.srt(\?|#|$)/i.test(url);

/**
 * Return a URL usable as `text/vtt`. VTT URLs pass straight through; SRT is
 * fetched, converted, and handed back as a blob URL (revoke it when done).
 */
export async function toVttUrl(url: string, kind?: string): Promise<string> {
  if (!isSrt(url, kind)) return url;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Subtitle fetch failed: ${res.status}`);
  const vtt = srtToVtt(await res.text());
  return URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }));
}
