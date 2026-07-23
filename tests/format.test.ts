import { describe, expect, it } from 'vitest';
import { classify } from '../src/utils/format';

// A stub media element whose native-HLS support we can toggle.
const media = (hls: boolean) =>
  ({ canPlayType: (t: string) => (t.includes('mpegurl') && hls ? 'maybe' : '') }) as HTMLMediaElement;

describe('classify', () => {
  it('routes DASH to the MSE engine', () => {
    expect(classify('https://x/y.mpd', media(false))).toBe('mse');
  });

  it('plays HLS natively when the browser supports it', () => {
    expect(classify('https://x/y.m3u8', media(true))).toBe('native');
  });

  it('falls back to MSE for HLS without native support', () => {
    expect(classify('https://x/y.m3u8', media(false))).toBe('mse');
  });

  it('plays MP4 natively', () => {
    expect(classify('https://x/y.mp4?sig=abc', media(false))).toBe('native');
  });
});
