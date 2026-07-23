# ferrite-player

Framework-agnostic **web-component video player**. One `<ferrite-player>` tag for
**MP4, HLS, DASH, and live** — [Shaka](https://github.com/shaka-project/shaka-player)
under the hood, loaded **only when the stream needs MSE** so MP4/native-HLS pay
nothing. Part of the [Ferrite](https://ferrite.io) video stack.

> Status: **0.0.1** — early. Core playback + default skin work; API evolving.

## Why

- **One tag, any format.** Point `src` at `.mp4`, `.m3u8`, or `.mpd`. It plays
  natively where the browser can (Safari/iOS HLS, MP4) and lazy-loads Shaka for
  DASH, non-native HLS, and low-latency live.
- **Tiny core.** Shaka only downloads when a manifest requires MSE.
- **HTML-first.** A custom element — no framework required. Works in React, Vue,
  Svelte, or plain HTML.
- **DRM & live.** Widevine / PlayReady / FairPlay and low-latency live via Shaka.
- **Themeable, accessible.** CSS custom properties, keyboard controls, ARIA,
  reduced-motion aware.

## Install

```sh
pnpm add ferrite-player
```

## Quickstart

```html
<script type="module">
  import 'ferrite-player';
</script>

<ferrite-player src="https://cdn.example.com/video/master.m3u8"></ferrite-player>
```

That's it — the default skin (play, seek, volume, quality, captions, PiP,
fullscreen, live badge, keyboard shortcuts) is included.

## API

```ts
const player = document.querySelector('ferrite-player')!;

// Load with options (live, low-latency, DRM):
await player.load('https://cdn.example.com/manifest.mpd', {
  lowLatency: true,
  drm: { servers: { 'com.widevine.alpha': 'https://license…' } },
});

player.play();
player.pause();
player.src;            // current source
player.state;          // live snapshot (paused, currentTime, qualities, live, …)
player.on(() => {});   // subscribe to state changes → unsubscribe fn
```

Attributes: `src`, `poster`, `autoplay`, `muted`, `crossorigin`.

## Theming

```css
ferrite-player {
  --fp-accent: #ff3e00;
  --fp-radius: 12px;
}
```

## Keyboard

`space`/`k` play · `←`/`→` seek ±5s · `↑`/`↓` volume · `m` mute · `f` fullscreen
· `c` captions.

## Development

```sh
pnpm install
pnpm dev        # demo on http://localhost:5273
pnpm build      # tsdown → dist/
pnpm test       # vitest
pnpm typecheck
```

## License

MIT © ebnsina
