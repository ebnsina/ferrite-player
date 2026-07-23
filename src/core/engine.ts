import type { LoadOptions, PlayerState } from './types';
import type { ShakaController } from './shaka';
import { classify } from '../utils/format';

type Emit = (patch: Partial<PlayerState>) => void;

/**
 * Owns the `<video>` element: loads a source through the right engine
 * (native or Shaka), mirrors media events into store patches via `emit`, and
 * exposes the actions the UI drives.
 */
export class Engine {
  private ctrl: ShakaController | null = null; // set on the MSE path
  private cleanup: Array<() => void> = [];

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
        ctrl.on('error', () => this.emit({ error: 'Playback error' }));
        this.emit({ engine: 'mse', live: ctrl.isLive() });
        this.syncTracks();
      } else {
        this.video.src = src;
        this.emit({ engine: 'native' });
      }
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
    this.emit({ engine: null, qualities: [], textTracks: [], currentQuality: -1, currentText: -1 });
  }

  private syncTracks(): void {
    if (!this.ctrl) return;
    this.emit({
      qualities: this.ctrl.getQualities(),
      textTracks: this.ctrl.getTextTracks(),
      live: this.ctrl.isLive(),
    });
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
    this.seek(Math.max(0, this.video.currentTime + delta));
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
    this.ctrl?.selectText(id);
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
  }
}
