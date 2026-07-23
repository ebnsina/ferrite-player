# ferrite-player — contributor & agent guide

Framework-agnostic web-component video player. One `<ferrite-player>` tag plays
MP4, HLS, DASH, and live; **Shaka** is the MSE engine, lazy-loaded only when a
manifest needs it. Part of the Ferrite video stack (transcoder → player →
analytics). See `README.md` for the API.

## Comments

Keep them to **1–2 lines**. Explain **why**, not what the code already says. No
essays, no restating the signature. Module headers: one line.

```ts
// Good — one line, explains the non-obvious reason:
// iPadOS reports as Mac; disambiguate via touch points.
```

## Conventions

- **Framework-agnostic.** Web standards only — custom elements, shadow DOM, the
  `<video>` element. No framework runtime deps. It must embed on any page.
- **Tiny core.** The `index` entry stays small; heavy deps (Shaka) are
  **dynamically imported** so they build as separate lazy chunks and only load
  when the stream requires MSE. Never static-import Shaka from the core path.
- **Modular.** Small focused files, one responsibility: `core/` (element,
  engine, store, types, shaka), `ui/` (skin, styles, icons), `utils/`
  (platform, format).
- **Errors don't reach the render path.** Loading degrades gracefully — native
  fallback where possible, an error overlay otherwise; never throw into event
  handlers or the UI update loop.
- **Docs before coding.** Verify Shaka Player and Web Platform APIs via context7
  before using them; check versions against the npm registry. Browser behaviour
  varies (iOS native HLS, FairPlay, PiP) — detect capabilities, don't assume.
- **Accessibility.** Controls are keyboard-operable with ARIA labels/roles.
  Respect `prefers-reduced-motion`.
- **Theming via CSS custom properties** (`--fp-accent`, `--fp-radius`) so hosts
  style without piercing the shadow boundary. Expose `part`s where useful.
- **No secrets in the bundle.** DRM license URLs / tokens are passed in at
  `load()` time by the host, never hardcoded.

## Layout

`src/core` (element · engine · shaka · store · types) · `src/ui` (skin ·
styles · icons) · `src/utils` (platform · format) · `demo/` · `tests/`.

## Dev

`pnpm install` · `pnpm dev` (demo on :5273) · `pnpm build` (tsdown → `dist/`) ·
`pnpm typecheck` · `pnpm test` (vitest) · `pnpm lint` / `pnpm format` (biome).

## Git

Commit per feature. Author `ebnsina <ebnsina.me@gmail.com>`. Never commit
`dist/` or `node_modules/`.
