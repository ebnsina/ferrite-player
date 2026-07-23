import { Engine } from './engine';
import { createStore } from './store';
import { type PlayerState, initialState, type LoadOptions } from './types';
import { Skin } from '../ui/skin';
import { css } from '../ui/styles';

/**
 * `<ferrite-player src="…">` — one tag for MP4, HLS, DASH, and live. Renders a
 * shadow-DOM `<video>` + the default skin, and drives everything through the
 * unified engine.
 *
 * Imperative API: `el.load(src, opts)`, `el.play()`, `el.pause()`, `el.src`,
 * plus a live `el.state` snapshot and `el.on(cb)` for state changes.
 */
export class FerritePlayer extends HTMLElement {
  static get observedAttributes() {
    return ['src', 'poster'];
  }

  private store = createStore<PlayerState>(initialState);
  private video!: HTMLVideoElement;
  private engine!: Engine;
  private skin?: Skin;
  private ready = false;

  connectedCallback(): void {
    if (this.ready) return;
    this.ready = true;

    const root = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = css;
    const wrap = document.createElement('div');
    wrap.className = 'wrap';
    this.video = document.createElement('video');
    this.video.playsInline = true;
    if (this.hasAttribute('muted')) this.video.muted = true;
    if (this.hasAttribute('poster')) this.video.poster = this.getAttribute('poster') ?? '';
    if (this.hasAttribute('crossorigin')) this.video.crossOrigin = this.getAttribute('crossorigin');
    wrap.appendChild(this.video);
    root.append(style, wrap);

    this.engine = new Engine(this.video, (patch) => this.store.set(patch));
    this.skin = new Skin(this, wrap, this.video, this.store, this.engine);

    const src = this.getAttribute('src');
    if (src) void this.load(src, { autoplay: this.hasAttribute('autoplay') });
  }

  disconnectedCallback(): void {
    this.skin?.destroy();
    this.engine?.destroy();
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (!this.ready) return;
    if (name === 'src' && value) void this.load(value);
    if (name === 'poster' && this.video) this.video.poster = value ?? '';
  }

  // --- public API ----------------------------------------------------------
  load(src: string, opts?: LoadOptions): Promise<void> {
    return this.engine.load(src, opts);
  }
  play(): Promise<void> {
    return this.engine.play();
  }
  pause(): void {
    this.engine.pause();
  }
  get src(): string | null {
    return this.store.get().src;
  }
  set src(value: string) {
    void this.load(value);
  }
  get state(): Readonly<PlayerState> {
    return this.store.get();
  }
  /** Subscribe to state changes; returns an unsubscribe fn. */
  on(cb: () => void): () => void {
    return this.store.subscribe(cb);
  }
}
