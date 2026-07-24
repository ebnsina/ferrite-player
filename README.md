<div align="center">

# ferrite-player

**One `<ferrite-player>` tag for MP4, HLS, DASH, and live.**

A framework-agnostic web-component video player. An adaptive streaming engine
powers HLS and DASH under the hood — and loads **only when the stream
needs MSE**, so MP4 and native HLS pay nothing for it.

[Live demo](https://ebnsina.github.io/ferrite-player/) · [Documentation](https://ebnsina.github.io/ferrite-player/docs.html) · Part of the [Ferrite](https://ferrite.io) video stack

![License](https://img.shields.io/badge/license-MIT-blue) ![Status](https://img.shields.io/badge/status-0.0.1%20·%20early-orange) ![No deps](https://img.shields.io/badge/framework%20deps-none-brightgreen)

</div>

---

## Why

|  | |
|---|---|
| **One tag, any format** | Point `src` at `.mp4`, `.m3u8`, or `.mpd`. It plays natively where the browser can (Safari/iOS HLS, MP4) and lazy-loads an adaptive engine for DASH, non-native HLS, and low-latency live. |
| **Tiny core** | The adaptive engine downloads as a separate chunk, and only when a manifest actually requires Media Source Extensions. |
| **HTML-first** | A standard custom element — no framework runtime. Drops into React, Vue, Svelte, or a plain HTML page unchanged. |
| **DRM & live** | Widevine, PlayReady, and FairPlay; low-latency live with a live badge and one-click jump to the edge. |
| **Captions, chapters & previews** | Side-load **VTT or SRT** subtitles (SRT auto-converted); WebVTT **chapters** as seek markers; hover the seek bar for a time bubble and **storyboard thumbnails**. |
| **Audio & casting** | Automatic multi-language **audio-track** switching; **AirPlay** + **Chromecast** (lazy-loaded), Picture-in-Picture. |
| **Analytics-ready** | Discrete `ferrite:*` DOM events (play, seeked, qualitychange, error, …) — the hook a beacon/analytics SDK listens on. |
| **Mobile-ready** | Touch tap/double-tap gestures, iOS native fullscreen, landscape-lock, and remembered volume/speed/captions. |
| **Themeable & accessible** | Style via CSS custom properties (no shadow piercing). Full keyboard control, ARIA roles, and `prefers-reduced-motion` support. |

## Install

```sh
pnpm add ferrite-player
```

Or straight from a CDN — no build step:

```html
<script type="module" src="https://esm.sh/ferrite-player"></script>
```

## Quickstart

```html
<script type="module">
  import 'ferrite-player'; // registers the <ferrite-player> element
</script>

<ferrite-player src="https://cdn.example.com/video/master.m3u8"></ferrite-player>
```

That's it. The default skin — play, scrubbable seek, volume, quality menu,
captions, picture-in-picture, fullscreen, live badge, and keyboard shortcuts —
is included.

## API

```ts
const player = document.querySelector('ferrite-player')!;

// Load with options — live, low-latency, DRM (license URLs passed at load time):
await player.load('https://cdn.example.com/manifest.mpd', {
  lowLatency: true,
  drm: { servers: { 'com.widevine.alpha': 'https://license…' } },
});

player.play();          // → Promise
player.pause();
player.src;             // current source (getter); setting it reloads
player.state;           // live snapshot: paused, currentTime, qualities, live, …
const off = player.on(() => {}); // subscribe to state changes → unsubscribe fn
```

**Attributes:** `src` · `poster` · `autoplay` · `muted` · `crossorigin`

Full reference — every attribute, method, state field, and event — in the
[documentation](https://ebnsina.github.io/ferrite-player/docs.html).

## Theming

Style with CSS custom properties; no shadow-DOM piercing required:

```css
ferrite-player {
  --fp-accent: #ff3e00; /* controls + progress */
  --fp-radius: 12px;    /* corner radius */
}
```

## Keyboard

| Key | Action | | Key | Action |
|---|---|---|---|---|
| `Space` / `K` | Play / pause | | `↑` / `↓` | Volume ±10% |
| `←` / `→` | Seek ∓5s | | `M` | Mute |
| `F` | Fullscreen | | `C` | Captions |

## Browser support

| Format | Chrome / Edge | Firefox | Safari / iOS |
|---|---|---|---|
| **MP4** | native | native | native |
| **HLS** | Adaptive (MSE) | Adaptive (MSE) | native |
| **DASH** | Adaptive (MSE) | Adaptive (MSE) | Adaptive (MSE) |
| **DRM** | Widevine / PlayReady | Widevine | FairPlay |

Modern evergreen browsers. Capabilities are detected at runtime — the player
picks native playback wherever it can and falls back to the adaptive engine otherwise.

## Development

```sh
pnpm install
pnpm dev        # demo on http://localhost:5273
pnpm build      # tsdown → dist/
pnpm test       # vitest
pnpm typecheck  # tsc --noEmit
pnpm lint       # biome
```

**Layout:** `src/core` (element · engine · store · types) ·
`src/ui` (skin · styles · icons) · `src/utils` (platform · format) ·
`demo/` · `docs/` · `tests/`.

## License

MIT © ebnsina
