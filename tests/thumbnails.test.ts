import { describe, expect, it } from 'vitest';
import { type Thumb, thumbAt } from '../src/utils/thumbnails';

const cues: Thumb[] = [
  { start: 0, end: 3, url: 'a.jpg', x: 0, y: 0, w: 160, h: 90 },
  { start: 3, end: 6, url: 'b.jpg', x: 160, y: 0, w: 160, h: 90 },
];

describe('thumbAt', () => {
  it('returns the cue covering the time', () => {
    expect(thumbAt(cues, 4)?.url).toBe('b.jpg');
    expect(thumbAt(cues, 1)?.url).toBe('a.jpg');
  });

  it('falls back to the nearest earlier cue past the end', () => {
    expect(thumbAt(cues, 99)?.url).toBe('b.jpg');
  });

  it('returns null with no cues', () => {
    expect(thumbAt([], 5)).toBeNull();
  });
});
