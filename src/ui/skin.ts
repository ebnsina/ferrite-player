import type { Engine } from '../core/engine';
import type { Store } from '../core/store';
import type { PlayerState } from '../core/types';
import { supportsPiP } from '../utils/platform';
import { icons } from './icons';

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

function fmt(t: number): string {
  if (!Number.isFinite(t)) return '0:00';
  const s = Math.floor(t % 60);
  const m = Math.floor(t / 60) % 60;
  const h = Math.floor(t / 3600);
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return `${h ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

/**
 * The default controls skin. Builds the DOM into `wrap`, subscribes to `store`,
 * and drives `engine` from user input. Kept in one cohesive unit for v0.
 */
export class Skin {
  private el!: Record<
    | 'big' | 'play' | 'mute' | 'time' | 'seek' | 'buf' | 'played' | 'thumb'
    | 'vol' | 'volfill' | 'volthumb' | 'cc' | 'settings' | 'pip' | 'fs' | 'menu' | 'live' | 'err',
    HTMLElement
  >;
  private hideTimer = 0;
  private offStore: () => void;
  private offDoc: () => void;

  constructor(
    private host: HTMLElement,
    private wrap: HTMLElement,
    private video: HTMLVideoElement,
    private store: Store<PlayerState>,
    private engine: Engine,
  ) {
    this.build();
    this.wire();
    this.offStore = store.subscribe(() => this.render());
    const onFs = () => {
      const fs = document.fullscreenElement === host;
      store.set({ fullscreen: fs });
    };
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
    const c = document.createElement('div');
    c.innerHTML = /* html */ `
      <div class="gradient"></div>
      <div class="center">
        <button class="big" part="play" aria-label="Play">${icons.play}</button>
        <div class="spinner"></div>
      </div>
      <div class="error"><div><p style="font-weight:600">Can’t play this video</p><p data-err style="opacity:.7;margin-top:4px"></p></div></div>
      <div class="controls">
        <div class="seek" data-seek role="slider" aria-label="Seek" tabindex="0">
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
          <button class="ctl" data-cc aria-label="Captions">${icons.captions}</button>
          <button class="ctl" data-settings aria-label="Settings">${icons.settings}</button>
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
      vol: q('[data-vol]'),
      volfill: q('[data-volfill]'),
      volthumb: q('[data-volthumb]'),
      cc: q('[data-cc]'),
      settings: q('[data-settings]'),
      pip: q('[data-pip]'),
      fs: q('[data-fs]'),
      menu: q('[data-menu]'),
      live: q('[data-live]'),
      err: q('[data-err]'),
    };
  }

  private wire(): void {
    const e = this.engine;
    this.el.big.onclick = () => e.toggle();
    this.el.play.onclick = () => e.toggle();
    this.video.addEventListener('click', () => e.toggle());
    this.el.mute.onclick = () => e.setMuted(!this.video.muted);
    this.el.live.onclick = () => e.goToLive();
    this.el.cc.onclick = () => this.toggleCaptions();
    this.el.settings.onclick = () => this.el.menu.classList.toggle('open');
    this.el.pip.onclick = () => this.togglePiP();
    this.el.fs.onclick = () => this.toggleFullscreen();
    if (!supportsPiP()) this.el.pip.classList.add('hidden');

    this.scrub(this.el.seek, (frac) => e.seek(frac * (this.store.get().duration || 0)));
    this.scrub(this.el.vol, (frac) => e.setVolume(frac));

    // Auto-hide + keyboard.
    const show = () => this.show();
    this.wrap.addEventListener('pointermove', show);
    this.wrap.addEventListener('pointerleave', () => this.scheduleHide(0));
    this.wrap.tabIndex = 0;
    this.wrap.addEventListener('keydown', (ev) => this.onKey(ev));
    document.addEventListener('pointerdown', (ev) => {
      if (!this.el.menu.contains(ev.target as Node) && ev.target !== this.el.settings) {
        this.el.menu.classList.remove('open');
      }
    });
  }

  /** Pointer scrubbing on a slider element; `onFrac` gets 0..1. */
  private scrub(slider: HTMLElement, onFrac: (f: number) => void): void {
    const at = (clientX: number) => {
      const r = slider.getBoundingClientRect();
      return Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    };
    let dragging = false;
    slider.addEventListener('pointerdown', (ev) => {
      dragging = true;
      slider.setPointerCapture(ev.pointerId);
      onFrac(at(ev.clientX));
    });
    slider.addEventListener('pointermove', (ev) => dragging && onFrac(at(ev.clientX)));
    slider.addEventListener('pointerup', () => (dragging = false));
  }

  private onKey(ev: KeyboardEvent): void {
    const e = this.engine;
    const s = this.store.get();
    const k = ev.key.toLowerCase();
    if (k === ' ' || k === 'k') e.toggle();
    else if (k === 'arrowright') e.seekBy(5);
    else if (k === 'arrowleft') e.seekBy(-5);
    else if (k === 'arrowup') e.setVolume(Math.min(1, s.volume + 0.1));
    else if (k === 'arrowdown') e.setVolume(Math.max(0, s.volume - 0.1));
    else if (k === 'f') this.toggleFullscreen();
    else if (k === 'm') e.setMuted(!s.muted);
    else if (k === 'c') this.toggleCaptions();
    else return;
    ev.preventDefault();
    this.show();
  }

  private toggleCaptions(): void {
    const s = this.store.get();
    if (!s.textTracks.length) return;
    this.engine.selectText(s.currentText >= 0 ? -1 : s.textTracks[0]!.id);
  }

  private async togglePiP(): Promise<void> {
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await this.video.requestPictureInPicture();
      this.store.set({ pip: !!document.pictureInPictureElement });
    } catch {
      /* denied / unsupported */
    }
  }

  private toggleFullscreen(): void {
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
      if (!this.store.get().paused) this.wrap.classList.remove('show');
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
    (this.el.played as HTMLElement).style.width = `${pct}%`;
    (this.el.buf as HTMLElement).style.width = `${dur ? (s.buffered / dur) * 100 : 0}%`;
    (this.el.thumb as HTMLElement).style.left = `${pct}%`;
    this.el.time.textContent = s.live ? 'LIVE' : `${fmt(s.currentTime)} / ${fmt(dur)}`;

    const vpct = (s.muted ? 0 : s.volume) * 100;
    (this.el.volfill as HTMLElement).style.width = `${vpct}%`;
    (this.el.volthumb as HTMLElement).style.left = `${vpct}%`;

    this.el.cc.classList.toggle('hidden', s.textTracks.length === 0);
    this.el.cc.style.color = s.currentText >= 0 ? 'var(--fp-accent)' : '';
    (this.el.err as HTMLElement).textContent = s.error ?? '';

    this.renderMenu(s);
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
    menu.textContent = '';
    if (s.qualities.length > 1) {
      const t = document.createElement('div');
      t.className = 'mtitle';
      t.textContent = 'Quality';
      menu.append(t, opt('Auto', s.currentQuality < 0, () => this.engine.selectQuality(-1)));
      for (const q of s.qualities)
        menu.append(opt(q.label, s.currentQuality === q.id, () => this.engine.selectQuality(q.id)));
    }
    const st = document.createElement('div');
    st.className = 'mtitle';
    st.textContent = 'Speed';
    menu.append(st);
    for (const r of RATES)
      menu.append(opt(r === 1 ? 'Normal' : `${r}×`, s.rate === r, () => this.engine.setRate(r)));
  }
}
