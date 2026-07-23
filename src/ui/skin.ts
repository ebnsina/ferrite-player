import type { Engine } from '../core/engine';
import type { Store } from '../core/store';
import type { PlayerState } from '../core/types';
import { hasTouch, isIOS, supportsAirPlay, supportsPiP } from '../utils/platform';
import { loadPrefs, savePrefs } from '../utils/prefs';
import { brandMark, icons } from './icons';

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

function fmt(t: number): string {
  if (!Number.isFinite(t)) return '0:00';
  const s = Math.floor(t % 60);
  const m = Math.floor(t / 60) % 60;
  const h = Math.floor(t / 3600);
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return `${h ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

type El =
  | 'big' | 'play' | 'mute' | 'time' | 'seek' | 'buf' | 'played' | 'thumb'
  | 'preview' | 'previewImg' | 'previewTime' | 'vol' | 'volfill' | 'volthumb'
  | 'cc' | 'settings' | 'pip' | 'airplay' | 'fs' | 'menu' | 'live' | 'err' | 'retry';

/**
 * The default controls skin. Builds the DOM into `wrap`, subscribes to `store`,
 * and drives `engine` from user input. One cohesive unit for the built-in UI.
 */
export class Skin {
  private el!: Record<El, HTMLElement>;
  private hideTimer = 0;
  private offStore: () => void;
  private offDoc: () => void;
  private saved: { volume: number; muted: boolean; rate: number };
  private textForSrc: string | null = null; // src we already auto-applied captions for

  constructor(
    private host: HTMLElement,
    private wrap: HTMLElement,
    private video: HTMLVideoElement,
    private store: Store<PlayerState>,
    private engine: Engine,
  ) {
    this.build();
    this.wire();

    // Restore remembered preferences before the first source plays.
    const prefs = loadPrefs();
    if (typeof prefs.volume === 'number') engine.setVolume(prefs.volume);
    if (prefs.muted) engine.setMuted(true);
    if (prefs.rate) engine.setRate(prefs.rate);
    this.saved = { volume: prefs.volume ?? 1, muted: !!prefs.muted, rate: prefs.rate ?? 1 };

    this.offStore = store.subscribe(() => this.render());
    const onFs = () => store.set({ fullscreen: document.fullscreenElement === host });
    document.addEventListener('fullscreenchange', onFs);
    this.offDoc = () => document.removeEventListener('fullscreenchange', onFs);
    this.render();
  }

  destroy(): void {
    this.offStore();
    this.offDoc();
    clearTimeout(this.hideTimer);
  }

  private build(): void {
    if (isIOS) this.wrap.classList.add('ios');
    if (hasTouch) this.wrap.classList.add('touch');

    const c = document.createElement('div');
    c.innerHTML = /* html */ `
      <div class="gradient"></div>
      <div class="brand" part="brand">${brandMark}<span>Ferrite <span class="pw">Player</span></span></div>
      <div class="center">
        <button class="big" part="play" aria-label="Play">${icons.play}</button>
        <div class="spinner"></div>
      </div>
      <div class="error">
        <div>
          <p style="font-weight:600">Can’t play this video</p>
          <p data-err style="opacity:.7;margin:4px 0 14px"></p>
          <button class="btn-retry" data-retry>${icons.replay}<span>Try again</span></button>
        </div>
      </div>
      <div class="controls">
        <div class="seek" data-seek role="slider" aria-label="Seek" tabindex="0">
          <div class="preview" data-preview><div class="preview-img" data-preview-img></div><span class="preview-time" data-preview-time>0:00</span></div>
          <div class="track"><div class="buf" data-buf></div><div class="played" data-played></div></div><div class="thumb" data-thumb></div>
        </div>
        <div class="row">
          <button class="ctl" data-play aria-label="Play">${icons.play}</button>
          <div class="volwrap row" style="gap:0">
            <button class="ctl" data-mute aria-label="Mute">${icons.volume}</button>
            <div class="vol"><div class="seek" data-vol role="slider" aria-label="Volume" tabindex="0"><div class="track"><div class="played" data-volfill></div></div><div class="thumb" data-volthumb></div></div></div>
          </div>
          <span class="time" data-time>0:00 / 0:00</span>
          <button class="live" data-live aria-label="Go to live"><span class="dot"></span> LIVE</button>
          <span class="spacer"></span>
          <button class="ctl" data-cc aria-label="Subtitles">${icons.captions}</button>
          <button class="ctl" data-settings aria-label="Settings">${icons.settings}</button>
          <button class="ctl" data-airplay aria-label="AirPlay">${icons.airplay}</button>
          <button class="ctl" data-pip aria-label="Picture in picture">${icons.pip}</button>
          <button class="ctl" data-fs aria-label="Fullscreen">${icons.enterFs}</button>
        </div>
      </div>
      <div class="menu" data-menu></div>
    `;
    while (c.firstElementChild) this.wrap.appendChild(c.firstElementChild);
    const q = (sel: string) => this.wrap.querySelector<HTMLElement>(sel) as HTMLElement;
    this.el = {
      big: q('.big'),
      play: q('[data-play]'),
      mute: q('[data-mute]'),
      time: q('[data-time]'),
      seek: q('[data-seek]'),
      buf: q('[data-buf]'),
      played: q('[data-played]'),
      thumb: q('[data-thumb]'),
      preview: q('[data-preview]'),
      previewImg: q('[data-preview-img]'),
      previewTime: q('[data-preview-time]'),
      vol: q('[data-vol]'),
      volfill: q('[data-volfill]'),
      volthumb: q('[data-volthumb]'),
      cc: q('[data-cc]'),
      settings: q('[data-settings]'),
      pip: q('[data-pip]'),
      airplay: q('[data-airplay]'),
      fs: q('[data-fs]'),
      menu: q('[data-menu]'),
      live: q('[data-live]'),
      err: q('[data-err]'),
      retry: q('[data-retry]'),
    };
  }

  private wire(): void {
    const e = this.engine;
    this.el.big.onclick = () => e.toggle();
    this.el.play.onclick = () => e.toggle();
    this.el.mute.onclick = () => e.setMuted(!this.video.muted);
    this.el.live.onclick = () => e.goToLive();
    this.el.cc.onclick = () => this.toggleCaptions();
    this.el.settings.onclick = () => this.el.menu.classList.toggle('open');
    this.el.pip.onclick = () => this.togglePiP();
    this.el.fs.onclick = () => this.toggleFullscreen();
    this.el.retry.onclick = () => {
      const src = this.store.get().src;
      if (src) void this.engine.load(src);
    };

    // PiP has no meaning on iOS's fullscreen-only video; AirPlay is Safari-only.
    if (!supportsPiP() || isIOS) this.el.pip.classList.add('hidden');
    if (supportsAirPlay()) this.setupAirPlay();
    else this.el.airplay.classList.add('hidden');

    this.scrub(this.el.seek, (frac) => e.seekToFraction(frac), true);
    this.scrub(this.el.vol, (frac) => e.setVolume(frac));

    // Seek hover preview (pointer devices).
    this.el.seek.addEventListener('pointermove', (ev) => {
      if (ev.pointerType !== 'touch') this.updatePreview(ev.clientX);
    });
    this.el.seek.addEventListener('pointerleave', () => this.el.seek.classList.remove('previewing'));

    // Show/keep-alive controls + auto-hide.
    this.wrap.addEventListener('pointermove', (ev) => {
      if (ev.pointerType !== 'touch') this.show();
    });
    this.wrap.addEventListener('pointerleave', () => this.scheduleHide(0));
    this.wrap.tabIndex = 0;
    this.wrap.addEventListener('keydown', (ev) => this.onKey(ev));

    if (hasTouch) this.setupTouch();
    else {
      this.video.addEventListener('click', () => e.toggle());
      this.video.addEventListener('dblclick', () => this.toggleFullscreen());
    }

    document.addEventListener('pointerdown', (ev) => {
      if (!this.el.menu.contains(ev.target as Node) && ev.target !== this.el.settings) {
        this.el.menu.classList.remove('open');
      }
    });
  }

  /** Pointer scrubbing on a slider; `onFrac` gets 0..1. `preview` shows the seek bubble. */
  private scrub(slider: HTMLElement, onFrac: (f: number) => void, preview = false): void {
    const at = (clientX: number) => {
      const r = slider.getBoundingClientRect();
      return Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    };
    let dragging = false;
    slider.addEventListener('pointerdown', (ev) => {
      dragging = true;
      slider.setPointerCapture(ev.pointerId);
      onFrac(at(ev.clientX));
      if (preview) this.updatePreview(ev.clientX);
    });
    slider.addEventListener('pointermove', (ev) => {
      if (!dragging) return;
      onFrac(at(ev.clientX));
      if (preview) this.updatePreview(ev.clientX);
    });
    const end = () => {
      dragging = false;
      if (preview) this.el.seek.classList.remove('previewing');
    };
    slider.addEventListener('pointerup', end);
    slider.addEventListener('pointercancel', end);
  }

  /** Position the seek preview (time bubble + storyboard thumbnail) at `clientX`. */
  private updatePreview(clientX: number): void {
    const r = this.el.seek.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    const dur = this.store.get().duration || 0;
    if (!dur) return;
    const t = frac * dur;
    this.el.seek.classList.add('previewing');
    this.el.previewTime.textContent = fmt(t);
    this.el.preview.style.left = `${Math.min(r.width - 4, Math.max(4, clientX - r.left))}px`;

    const th = this.engine.thumbnailAt(t);
    const img = this.el.previewImg;
    if (th) {
      img.style.backgroundImage = `url("${th.url}")`;
      if (th.w && th.h) {
        img.style.width = `${th.w}px`;
        img.style.height = `${th.h}px`;
        img.style.backgroundPosition = `-${th.x}px -${th.y}px`;
        img.style.backgroundSize = 'auto';
      } else {
        img.style.width = '160px';
        img.style.height = '90px';
        img.style.backgroundPosition = 'center';
        img.style.backgroundSize = 'cover';
      }
      img.style.display = 'block';
    } else {
      img.style.display = 'none';
    }
  }

  /** Tap toggles controls; double-tap left/right seeks ∓10s, centre toggles play. */
  private setupTouch(): void {
    let lastTap = 0;
    let lastX = 0;
    this.wrap.addEventListener('pointerup', (ev) => {
      if (ev.pointerType !== 'touch') return;
      if ((ev.target as HTMLElement).closest('.controls, .menu, .brand, .big, .error')) return;
      const now = Date.now();
      if (now - lastTap < 300 && Math.abs(ev.clientX - lastX) < 48) {
        const r = this.wrap.getBoundingClientRect();
        const x = ev.clientX - r.left;
        if (x < r.width * 0.35) {
          this.engine.seekBy(-10);
          this.ripple('back');
        } else if (x > r.width * 0.65) {
          this.engine.seekBy(10);
          this.ripple('fwd');
        } else {
          this.engine.toggle();
        }
        lastTap = 0;
      } else {
        lastTap = now;
        lastX = ev.clientX;
        this.wrap.classList.contains('show') ? this.wrap.classList.remove('show') : this.show();
      }
    });
  }

  private ripple(dir: 'fwd' | 'back'): void {
    const r = document.createElement('div');
    r.className = `ripple ${dir}`;
    r.textContent = dir === 'fwd' ? '10 »' : '« 10';
    this.wrap.appendChild(r);
    setTimeout(() => r.remove(), 550);
  }

  private setupAirPlay(): void {
    const v = this.video as HTMLVideoElement & {
      webkitShowPlaybackTargetPicker?: () => void;
      addEventListener(t: string, f: () => void): void;
    };
    this.el.airplay.onclick = () => v.webkitShowPlaybackTargetPicker?.();
    // Hide the button until a route is actually available.
    this.el.airplay.classList.add('hidden');
    v.addEventListener('webkitplaybacktargetavailabilitychanged', ((ev: Event) => {
      const avail = (ev as unknown as { availability?: string }).availability === 'available';
      this.el.airplay.classList.toggle('hidden', !avail);
    }) as () => void);
  }

  private onKey(ev: KeyboardEvent): void {
    const e = this.engine;
    const s = this.store.get();
    const k = ev.key.toLowerCase();
    if (k === ' ' || k === 'k') e.toggle();
    else if (k === 'arrowright' || k === 'l') e.seekBy(k === 'l' ? 10 : 5);
    else if (k === 'arrowleft' || k === 'j') e.seekBy(k === 'j' ? -10 : -5);
    else if (k === 'arrowup') e.setVolume(Math.min(1, s.volume + 0.1));
    else if (k === 'arrowdown') e.setVolume(Math.max(0, s.volume - 0.1));
    else if (k === 'home') e.seek(0);
    else if (k === 'end') e.seek(s.duration || 0);
    else if (k >= '0' && k <= '9') e.seekToFraction(Number(k) / 10);
    else if (k === 'f') this.toggleFullscreen();
    else if (k === 'm') e.setMuted(!s.muted);
    else if (k === 'c') this.toggleCaptions();
    else if (k === '>' || (k === '.' && ev.shiftKey)) e.setRate(this.stepRate(s.rate, 1));
    else if (k === '<' || (k === ',' && ev.shiftKey)) e.setRate(this.stepRate(s.rate, -1));
    else return;
    ev.preventDefault();
    this.show();
  }

  private stepRate(rate: number, dir: number): number {
    const i = RATES.indexOf(rate);
    const next = Math.min(RATES.length - 1, Math.max(0, (i < 0 ? RATES.indexOf(1) : i) + dir));
    return RATES[next] ?? 1;
  }

  private toggleCaptions(): void {
    const s = this.store.get();
    if (!s.textTracks.length) return;
    this.chooseText(s.currentText >= 0 ? -1 : (s.textTracks[0]?.id ?? -1));
  }

  /** Select a caption track and remember the choice for next time. */
  private chooseText(id: number): void {
    this.engine.selectText(id);
    const lang = id < 0 ? null : (this.store.get().textTracks.find((t) => t.id === id)?.language ?? null);
    savePrefs({ textLang: lang });
  }

  private async togglePiP(): Promise<void> {
    const v = this.video as HTMLVideoElement & {
      webkitSetPresentationMode?: (m: string) => void;
      webkitPresentationMode?: string;
    };
    try {
      if (v.webkitSetPresentationMode) {
        v.webkitSetPresentationMode(v.webkitPresentationMode === 'picture-in-picture' ? 'inline' : 'picture-in-picture');
        return;
      }
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await this.video.requestPictureInPicture();
      this.store.set({ pip: !!document.pictureInPictureElement });
    } catch {
      /* denied / unsupported */
    }
  }

  private toggleFullscreen(): void {
    const v = this.video as HTMLVideoElement & { webkitEnterFullscreen?: () => void };
    // iOS Safari only allows native <video> fullscreen, not element fullscreen.
    if (isIOS || typeof this.host.requestFullscreen !== 'function') {
      v.webkitEnterFullscreen?.();
      return;
    }
    if (document.fullscreenElement === this.host) document.exitFullscreen().catch(() => {});
    else this.host.requestFullscreen().catch(() => {});
  }

  private show(): void {
    this.wrap.classList.add('show');
    this.scheduleHide(2500);
  }
  private scheduleHide(ms: number): void {
    clearTimeout(this.hideTimer);
    this.hideTimer = window.setTimeout(() => {
      if (!this.store.get().paused && !this.el.menu.classList.contains('open')) {
        this.wrap.classList.remove('show');
      }
    }, ms);
  }

  private render(): void {
    const s = this.store.get();
    const w = this.wrap.classList;
    w.toggle('paused', s.paused);
    w.toggle('waiting', s.waiting);
    w.toggle('error', !!s.error);
    w.toggle('live-on', s.live);
    w.toggle('at-edge', s.atLiveEdge);

    const playIcon = s.ended ? icons.replay : s.paused ? icons.play : icons.pause;
    this.el.big.innerHTML = s.ended ? icons.replay : icons.play;
    this.el.play.innerHTML = playIcon;
    this.el.mute.innerHTML = s.muted || s.volume === 0 ? icons.muted : icons.volume;
    this.el.fs.innerHTML = s.fullscreen ? icons.exitFs : icons.enterFs;

    const dur = s.duration || 0;
    const pct = dur ? (s.currentTime / dur) * 100 : 0;
    this.el.played.style.width = `${pct}%`;
    this.el.buf.style.width = `${dur ? (s.buffered / dur) * 100 : 0}%`;
    this.el.thumb.style.left = `${pct}%`;
    this.el.time.textContent = s.live ? 'LIVE' : `${fmt(s.currentTime)} / ${fmt(dur)}`;

    const vpct = (s.muted ? 0 : s.volume) * 100;
    this.el.volfill.style.width = `${vpct}%`;
    this.el.volthumb.style.left = `${vpct}%`;

    this.el.cc.classList.toggle('hidden', s.textTracks.length === 0);
    this.el.cc.style.color = s.currentText >= 0 ? 'var(--fp-accent)' : '';
    this.el.err.textContent = s.error ?? '';

    this.persist(s);
    this.autoCaptions(s);
    this.renderMenu(s);
  }

  /** Save volume / mute / rate when they change. */
  private persist(s: PlayerState): void {
    if (s.volume !== this.saved.volume || s.muted !== this.saved.muted) {
      this.saved.volume = s.volume;
      this.saved.muted = s.muted;
      savePrefs({ volume: s.volume, muted: s.muted });
    }
    if (s.rate !== this.saved.rate) {
      this.saved.rate = s.rate;
      savePrefs({ rate: s.rate });
    }
  }

  /** Re-enable the remembered caption language once tracks appear for a source. */
  private autoCaptions(s: PlayerState): void {
    if (!s.src || s.src === this.textForSrc || !s.textTracks.length) return;
    this.textForSrc = s.src;
    const lang = loadPrefs().textLang;
    if (!lang) return;
    const match = s.textTracks.find((t) => t.language === lang);
    if (match && s.currentText < 0) this.engine.selectText(match.id);
  }

  private renderMenu(s: PlayerState): void {
    const menu = this.el.menu;
    const opt = (label: string, checked: boolean, onClick: () => void) => {
      const b = document.createElement('button');
      b.setAttribute('aria-checked', String(checked));
      b.innerHTML = `<span>${label}</span>${checked ? icons.check : ''}`;
      b.onclick = () => {
        onClick();
        menu.classList.remove('open');
      };
      return b;
    };
    const title = (t: string) => {
      const d = document.createElement('div');
      d.className = 'mtitle';
      d.textContent = t;
      return d;
    };
    menu.textContent = '';

    if (s.textTracks.length) {
      menu.append(title('Subtitles'), opt('Off', s.currentText < 0, () => this.chooseText(-1)));
      for (const t of s.textTracks) {
        menu.append(opt(t.label, s.currentText === t.id, () => this.chooseText(t.id)));
      }
    }
    if (s.qualities.length > 1) {
      menu.append(title('Quality'), opt('Auto', s.currentQuality < 0, () => this.engine.selectQuality(-1)));
      for (const q of s.qualities) {
        menu.append(opt(q.label, s.currentQuality === q.id, () => this.engine.selectQuality(q.id)));
      }
    }
    menu.append(title('Speed'));
    for (const r of RATES) {
      menu.append(opt(r === 1 ? 'Normal' : `${r}×`, s.rate === r, () => this.engine.setRate(r)));
    }
    const brand = document.createElement('div');
    brand.className = 'mbrand';
    brand.innerHTML = `${brandMark}<span>Ferrite Player</span>`;
    menu.append(brand);
  }
}
