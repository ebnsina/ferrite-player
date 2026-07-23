import { describe, expect, it } from 'vitest';
import { srtToVtt, toVttUrl } from '../src/utils/subtitles';

describe('srtToVtt', () => {
  it('adds a WEBVTT header and converts comma timestamps to dots', () => {
    const vtt = srtToVtt('1\n00:00:01,000 --> 00:00:04,500\nHello\n');
    expect(vtt.startsWith('WEBVTT')).toBe(true);
    expect(vtt).toContain('00:00:01.000 --> 00:00:04.500');
    expect(vtt).toContain('Hello');
  });

  it('strips BOM and carriage returns', () => {
    const vtt = srtToVtt('﻿1\r\n00:00:00,000 --> 00:00:02,000\r\nHi\r\n');
    expect(vtt).not.toContain('\r');
    expect(vtt).not.toContain('﻿');
  });
});

describe('toVttUrl', () => {
  it('passes WebVTT URLs through untouched', async () => {
    expect(await toVttUrl('https://cdn.example.com/en.vtt')).toBe('https://cdn.example.com/en.vtt');
  });
});
