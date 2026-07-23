import type { LoadOptions, PlayerState, SubtitleSource, TextTrack } from './types';
import type { ShakaController } from './shaka';
import { classify } from '../utils/format';
import { toVttUrl } from '../utils/subtitles';
import { loadThumbnails, thumbAt, type Thumb } from '../utils/thumbnails';

type Emit = (patch: Partial<PlayerState>) => void;

/**
 * Owns the `<video>` element: loads a source through the right engine
 * (native or Shaka), mirrors media events into store patches via `emit`, and
 * exposes the actions the UI drives.
 */
export class Engine {
  private ctrl: ShakaController | null = null; // set on the MSE path
  private cleanup: Array<() => void> = [];
  private objectUrls: string[] = []; // blob URLs (converted SRT) to revoke
  private thumbs: Thumb[] = [];

  constructor(
    private video: HTMLVideoElement,
    private emit: Emit,
  ) {
    this.wireMediaEvents();
  }

  async load(src: string, opts: LoadOptions = {}): Promise<void> {
    await this.unload();
    this.emit({ src, error: null, waiting: true });
    const kind = classify(src, this.video, opts);
    try {
      if (kind === 'mse') {
        const { loadShaka } = await import('./shaka');
        const ctrl = await loadShaka(this.video, src, opts);
        this.ctrl = ctrl;
        const refresh = () => this.syncTracks();
        for (const ev of ['trackschanged', 'adaptation', 'variantchanged', 'texttrackvisibility']) {
          ctrl.on(ev, refresh);
        }
        ctrl.on('error', () => this.emit({ error: 'Something went wrong while playing this video.' }));
        this.emit({ engine: 'mse', live: ctrl.isLive() });
      } else {
        this.video.src = src;
        this.emit({ engine: 'native' });
      }
      if (opts.subtitles?.length) await this.applySubtitles(opts.subtitles);
      this.syncTracks();
      if (opts.thumbnails) void this.loadThumbs(opts.thumbnails);
      if (opts.autoplay) {
        this.video.muted = true;
        void this.video.play().catch(() => {});
      }
    } catch (e) {
      this.emit({ error: e instanceof Error ? e.message : 'Could not load this video.', waiting: false });
    }
  }

  async unload(): Promise<void> {
    if (this.ctrl) {
      await this.ctrl.destroy().catch(() => {});
      this.ctrl = null;
    } else {
      this.video.removeAttribute('src');
      this.video.load();
    }
    for (const t of [...this.video.querySelectorAll('track')]) t.remove();
    for (const u of this.objectUrls) URL.revokeObjectURL(u);
    this.objectUrls = [];
    this.thumbs = [];
    this.emit({ engine: null, qualities: [], textTracks: [], currentQuality: -1, currentText: -1 });
  }

  // --- subtitles -----------------------------------------------------------
  private async applySubtitles(list: SubtitleSource[]): Promise<void> {
    for (const s of list) {
      const url = await toVttUrl(s.url, s.srt ? 'srt' : undefined).catch(() => s.url);
      if (url.startsWith('blob:')) this.objectUrls.push(url);
      const kind = s.kind ?? 'subtitles';
      if (this.ctrl) {
        await this.ctrl.addText(url, s.language, kind, 'text/vtt', s.label ?? s.language).catch(() => {});
      } else {
        const track = document.createElement('track');
        track.kind = kind;
        track.label = s.label ?? s.language;
        track.srclang = s.language;
        track.src = url;
        this.video.appendChild(track);
      }
    }
  }

  /** Public: add subtitle tracks (VTT or SRT) after the source has loaded. */
  async addSubtitles(list: SubtitleSource[]): Promise<void> {
    await this.applySubtitles(list);
    this.syncTracks();
  }

  // --- thumbnails ----------------------------------------------------------
  private async loadThumbs(url: string): Promise<void> {
    try {
      this.thumbs = await loadThumbnails(url);
      this.emit({}); // nudge subscribers so the UI can enable previews
    } catch {
      this.thumbs = [];
    }
  }
  /** Storyboard thumbnail covering time `t`, or null when none is loaded. */
  thumbnailAt(t: number): Thumb | null {
    return thumbAt(this.thumbs, t);
  }
  hasThumbnails(): boolean {
    return this.thumbs.length > 0;
  }

  // --- track sync ----------------------------------------------------------
  private syncTracks(): void {
    if (this.ctrl) {
      this.emit({
        qualities: this.ctrl.getQualities(),
        textTracks: this.ctrl.getTextTracks(),
        live: this.ctrl.isLive(),
      });
    } else {
      this.emit({ textTracks: this.nativeTextTracks() });
    }
  }

  private nativeTextTracks(): TextTrack[] {
    const out: TextTrack[] = [];
    const tt = this.video.textTracks;
    for (let i = 0; i < tt.length; i++) {
      const t = tt[i];
      if (!t || (t.kind !== 'subtitles' && t.kind !== 'captions')) continue;
      out.push({ id: i, language: t.language, label: t.label || t.language || `Track ${i + 1}` });
    }
    return out;
  }

  // --- actions -------------------------------------------------------------
  play(): Promise<void> {
    return this.video.play().catch(() => {});
  }
  pause(): void {
    this.video.pause();
  }
  toggle(): void {
    this.video.paused ? void this.play() : this.pause();
  }
  seek(t: number): void {
    this.video.currentTime = t;
  }
  seekBy(delta: number): void {
    const dur = this.video.duration || 0;
    this.seek(Math.min(dur || Infinity, Math.max(0, this.video.currentTime + delta)));
  }
  seekToFraction(frac: number): void {
    const dur = this.video.duration || 0;
    if (dur) this.seek(dur * Math.min(1, Math.max(0, frac)));
  }
  setVolume(v: number): void {
    this.video.volume = Math.min(1, Math.max(0, v));
    if (v > 0) this.video.muted = false;
  }
  setMuted(m: boolean): void {
    this.video.muted = m;
  }
  setRate(r: number): void {
    this.video.playbackRate = r;
  }
  selectQuality(id: number): void {
    this.ctrl?.selectQuality(id);
    this.emit({ currentQuality: id });
  }
  selectText(id: number): void {
    if (this.ctrl) {
      this.ctrl.selectText(id);
      this.emit({ currentText: id });
      return;
    }
    const tt = this.video.textTracks;
    for (let i = 0; i < tt.length; i++) {
      const t = tt[i];
      if (t) t.mode = i === id ? 'showing' : 'hidden';
    }
    this.emit({ currentText: id });
  }
  goToLive(): void {
    if (this.ctrl?.isLive()) this.seek(this.ctrl.liveEdge());
  }

  destroy(): void {
    for (const off of this.cleanup) off();
    this.cleanup = [];
    void this.unload();
  }

  // --- media event mirroring ----------------------------------------------
  private wireMediaEvents(): void {
    const v = this.video;
    const on = (ev: string, fn: () => void) => {
      v.addEventListener(ev, fn);
      this.cleanup.push(() => v.removeEventListener(ev, fn));
    };
    const buffered = () => {
      const n = v.buffered.length;
      return n ? v.buffered.end(n - 1) : 0;
    };
    const liveEdge = () => {
      if (!this.ctrl?.isLive()) return true;
      return this.ctrl.liveEdge() - v.currentTime < 10;
    };

    on('loadedmetadata', () => this.emit({ duration: v.duration || 0 }));
    on('durationchange', () => this.emit({ duration: v.duration || 0 }));
    on('play', () => this.emit({ paused: false, ended: false }));
    on('pause', () => this.emit({ paused: true }));
    on('ended', () => this.emit({ ended: true, paused: true }));
    on('waiting', () => this.emit({ waiting: true }));
    on('playing', () => this.emit({ waiting: false, paused: false }));
    on('canplay', () => this.emit({ waiting: false }));
    on('seeking', () => this.emit({ seeking: true }));
    on('seeked', () => this.emit({ seeking: false }));
    on('timeupdate', () =>
      this.emit({ currentTime: v.currentTime, buffered: buffered(), atLiveEdge: liveEdge() }));
    on('progress', () => this.emit({ buffered: buffered() }));
    on('volumechange', () => this.emit({ volume: v.volume, muted: v.muted }));
    on('ratechange', () => this.emit({ rate: v.playbackRate }));
    on('error', () => this.emit({ error: 'This video could not be played.', waiting: false }));

    // Native (non-Shaka) text tracks appear asynchronously; mirror list changes.
    const tt = v.textTracks as TextTrackList & {
      addEventListener?: (t: string, f: () => void) => void;
      removeEventListener?: (t: string, f: () => void) => void;
    };
    const onTT = () => {
      if (!this.ctrl) this.syncTracks();
    };
    tt.addEventListener?.('addtrack', onTT);
    tt.addEventListener?.('removetrack', onTT);
    this.cleanup.push(() => {
      tt.removeEventListener?.('addtrack', onTT);
      tt.removeEventListener?.('removetrack', onTT);
    });
  }
}
