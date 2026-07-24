import { describe, expect, it } from 'vitest';
import { chapterAt, parseChapters } from '../src/utils/chapters';

const vtt = `WEBVTT

00:00:00.000 --> 00:00:30.000
Intro

00:00:30.000 --> 00:01:00.000
The Main Part
`;

describe('parseChapters', () => {
  it('parses titles and times', () => {
    const ch = parseChapters(vtt);
    expect(ch).toHaveLength(2);
    expect(ch[0]).toMatchObject({ start: 0, end: 30, title: 'Intro' });
    expect(ch[1]?.title).toBe('The Main Part');
  });

  it('chapterAt returns the active chapter', () => {
    const ch = parseChapters(vtt);
    expect(chapterAt(ch, 5)?.title).toBe('Intro');
    expect(chapterAt(ch, 45)?.title).toBe('The Main Part');
    expect(chapterAt(ch, -1)).toBeNull();
  });
});
