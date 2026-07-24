import { type Chapter, chapterAt, loadChapters } from '../utils/chapters';
import { classify } from '../utils/format';
import { toVttUrl } from '../utils/subtitles';
import { type Thumb, loadThumbnails, thumbAt } from '../utils/thumbnails';
import type { ShakaController } from './shaka';
import type {
  AudioTrack,
  LoadOptions,
  PlayerEvent,
  PlayerState,
  SubtitleSource,
  TextTrack,
} from './types';

type Emit = (patch: Partial<PlayerState>) => void;
type EmitEvent = (name: PlayerEvent, detail?: unknown) => void;

/**
 * Owns the `<video>` element: loads a source through the right engine
 * (native or Shaka), mirrors media events into store patches + discrete
 * events, and exposes the actions the UI drives.
 */
export class Engine {
  private ctrl: ShakaController | null = null; // set on the MSE path
  private cleanup: Array<() => void> = [];
  private objectUrls: string[] = []; // blob URLs (converted SRT) to revoke
  private thumbs: Thumb[] = [];
  private chapters: Chapter[] = [];

  constructor(
    private video: HTMLVideoElement,
    private emit: Emit,
    private emitEvent: EmitEvent = () => {},
  ) {
    this.wireMediaEvents();
  }

  async load(src: string, opts: LoadOptions = {}): Promise<void> {
    await this.unload();
    this.emit({ src, error: null, waiting: true });
    this.emitEvent('loadstart', { src });
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
        ctrl.on('error', () => this.fail('Something went wrong while playing this video.'));
        this.emit({ engine: 'mse', live: ctrl.isLive() });
      } else {
        this.video.src = src;
        this.emit({ engine: 'native' });
      }
      if (opts.subtitles?.length) await this.applySubtitles(opts.subtitles);
      this.syncTracks();
      if (opts.thumbnails) void this.loadThumbs(opts.thumbnails);
      if (opts.chapters) void this.loadChaptersFrom(opts.chapters);
      if (opts.autoplay) {
        this.video.muted = true;
        void this.video.play().catch(() => {});
      }
    } catch (e) {
      this.fail(e instanceof Error ? e.message : 'Could not load this video.');
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
    this.chapters = [];
    this.emit({
      engine: null,
      qualities: [],
      textTracks: [],
      audioTracks: [],
      chapters: [],
      currentQuality: -1,
      currentText: -1,
      currentAudio: -1,
    });
  }

  private fail(message: string): void {
    this.emit({ error: message, waiting: false });
    this.emitEvent('error', { message });
  }

  // --- subtitles -----------------------------------------------------------
  private async applySubtitles(list: SubtitleSource[]): Promise<void> {
    for (const s of list) {
      const url = await toVttUrl(s.url, s.srt ? 'srt' : undefined).catch(() => s.url);
      if (url.startsWith('blob:')) this.objectUrls.push(url);
      const kind = s.kind ?? 'subtitles';
      if (this.ctrl) {
        await this.ctrl
          .addText(url, s.language, kind, 'text/vtt', s.label ?? s.language)
          .catch(() => {});
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

  // --- thumbnails / chapters ----------------------------------------------
  private async loadThumbs(url: string): Promise<void> {
    try {
      this.thumbs = await loadThumbnails(url);
      this.emit({});
    } catch {
      this.thumbs = [];
    }
  }
  private async loadChaptersFrom(url: string): Promise<void> {
    try {
      this.chapters = await loadChapters(url);
      this.emit({ chapters: this.chapters });
    } catch {
      this.chapters = [];
    }
  }
  thumbnailAt(t: number): Thumb | null {
    return thumbAt(this.thumbs, t);
  }
  hasThumbnails(): boolean {
    return this.thumbs.length > 0;
  }
  chapterAt(t: number): Chapter | null {
    return chapterAt(this.chapters, t);
  }

  // --- track sync ----------------------------------------------------------
  private syncTracks(): void {
    if (this.ctrl) {
      this.emit({
        qualities: this.ctrl.getQualities(),
        textTracks: this.ctrl.getTextTracks(),
        audioTracks: this.ctrl.getAudioTracks(),
        currentAudio: this.ctrl.currentAudio(),
        live: this.ctrl.isLive(),
      });
    } else {
      this.emit({ textTracks: this.nativeTextTracks(), audioTracks: this.nativeAudioTracks() });
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

  private nativeAudioTracks(): AudioTrack[] {
    const list = (
      this.video as unknown as { audioTracks?: ArrayLike<{ language: string; label: string }> }
    ).audioTracks;
    const out: AudioTrack[] = [];
    if (!list) return out;
    for (let i = 0; i < list.length; i++) {
      const t = list[i];
      if (t)
        out.push({ id: i, language: t.language, label: t.label || t.language || `Audio ${i + 1}` });
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
    this.seek(
      Math.min(dur || Number.POSITIVE_INFINITY, Math.max(0, this.video.currentTime + delta)),
    );
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
    this.emitEvent('qualitychange', { id });
  }
  selectText(id: number): void {
    if (this.ctrl) {
      this.ctrl.selectText(id);
    } else {
      const tt = this.video.textTracks;
      for (let i = 0; i < tt.length; i++) {
        const t = tt[i];
        if (t) t.mode = i === id ? 'showing' : 'hidden';
      }
    }
    this.emit({ currentText: id });
    this.emitEvent('texttrackchange', { id });
  }
  selectAudio(id: number): void {
    if (this.ctrl) {
      this.ctrl.selectAudio(id);
    } else {
      const list = (this.video as unknown as { audioTracks?: ArrayLike<{ enabled: boolean }> })
        .audioTracks;
      if (list)
        for (let i = 0; i < list.length; i++) {
          const t = list[i];
          if (t) t.enabled = i === id;
        }
    }
    this.emit({ currentAudio: id });
    this.emitEvent('audiochange', { id });
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
    // Mirror to store, and forward the same beat as a discrete analytics event.
    const both = (
      ev: string,
      name: PlayerEvent,
      patch: () => Partial<PlayerState>,
      detail?: () => unknown,
    ) =>
      on(ev, () => {
        this.emit(patch());
        this.emitEvent(name, detail?.());
      });

    both(
      'loadedmetadata',
      'loadedmetadata',
      () => ({ duration: v.duration || 0 }),
      () => ({ duration: v.duration }),
    );
    on('durationchange', () => this.emit({ duration: v.duration || 0 }));
    both('play', 'play', () => ({ paused: false, ended: false }));
    both('pause', 'pause', () => ({ paused: true }));
    both('ended', 'ended', () => ({ ended: true, paused: true }));
    both('waiting', 'waiting', () => ({ waiting: true }));
    both('playing', 'playing', () => ({ waiting: false, paused: false }));
    on('canplay', () => this.emit({ waiting: false }));
    both('seeking', 'seeking', () => ({ seeking: true }));
    both(
      'seeked',
      'seeked',
      () => ({ seeking: false }),
      () => ({ currentTime: v.currentTime }),
    );
    both(
      'timeupdate',
      'timeupdate',
      () => ({ currentTime: v.currentTime, buffered: buffered(), atLiveEdge: liveEdge() }),
      () => ({ currentTime: v.currentTime }),
    );
    on('progress', () => this.emit({ buffered: buffered() }));
    both(
      'volumechange',
      'volumechange',
      () => ({ volume: v.volume, muted: v.muted }),
      () => ({ volume: v.volume, muted: v.muted }),
    );
    both(
      'ratechange',
      'ratechange',
      () => ({ rate: v.playbackRate }),
      () => ({ rate: v.playbackRate }),
    );
    on('error', () => this.fail('This video could not be played.'));

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
