// Scoped styles for the shadow DOM skin. Themeable via CSS custom properties
// (--fp-accent, --fp-radius) without piercing the shadow boundary.
export const css = /* css */ `
:host {
  --fp-accent: #ff3e00;
  --fp-bg: #000;
  --fp-radius: 14px;
  --fp-fg: #fff;
  display: block;
  contain: content;
}
* { box-sizing: border-box; }
.wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: var(--fp-bg);
  border-radius: var(--fp-radius);
  overflow: hidden;
  font: 500 13px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif;
  color: var(--fp-fg);
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.wrap.fs { aspect-ratio: auto; height: 100%; border-radius: 0; }
video { width: 100%; height: 100%; display: block; background: #000; object-fit: contain; }
:focus-visible { outline: 2px solid var(--fp-accent); outline-offset: 2px; border-radius: 6px; }

/* bottom scrim */
.gradient {
  position: absolute; inset: auto 0 0 0; height: 46%;
  background: linear-gradient(transparent, rgba(0,0,0,.35) 45%, rgba(0,0,0,.78));
  pointer-events: none; opacity: 0; transition: opacity .25s;
}
.wrap.show .gradient, .wrap.paused .gradient { opacity: 1; }

/* center play / spinner */
.center { position: absolute; inset: 0; display: grid; place-items: center; pointer-events: none; }
.big {
  width: 72px; height: 72px; border-radius: 50%;
  background: rgba(10,10,12,.5); backdrop-filter: blur(6px);
  display: grid; place-items: center; pointer-events: auto; cursor: pointer;
  border: none; color: #fff; box-shadow: 0 6px 24px rgba(0,0,0,.4);
  transition: transform .16s cubic-bezier(.2,.7,.3,1), opacity .25s, background .16s;
}
.big svg { width: 34px; height: 34px; fill: currentColor; margin-left: 2px; }
.big:hover { background: var(--fp-accent); transform: scale(1.06); }
.wrap:not(.paused) .big { opacity: 0; transform: scale(.85); pointer-events: none; }
.spinner {
  width: 46px; height: 46px; border-radius: 50%;
  border: 3px solid rgba(255,255,255,.22); border-top-color: #fff;
  animation: fp-spin .8s linear infinite; display: none;
}
.wrap.waiting .spinner { display: block; }
.wrap.waiting .big { display: none; }
@keyframes fp-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .spinner { animation-duration: 2s; } .big, .gradient, .controls { transition: none; } }

/* controls */
.controls {
  position: absolute; inset: auto 0 0 0; padding: 0 14px 10px;
  opacity: 0; transform: translateY(8px); transition: opacity .25s, transform .25s;
}
.wrap.show .controls, .wrap.paused .controls { opacity: 1; transform: none; }
.row { display: flex; align-items: center; gap: 4px; }
.spacer { flex: 1; }
button.ctl {
  appearance: none; border: none; background: none; color: #fff; cursor: pointer;
  width: 38px; height: 38px; border-radius: 9px; display: grid; place-items: center;
  transition: background .12s, transform .1s;
}
button.ctl:hover { background: rgba(255,255,255,.16); }
button.ctl:active { transform: scale(.92); }
button.ctl svg { width: 23px; height: 23px; fill: currentColor; }
.time { font-variant-numeric: tabular-nums; padding: 0 8px; opacity: .92; white-space: nowrap; letter-spacing: .01em; }

/* seek + volume sliders */
.seek { position: relative; height: 18px; display: flex; align-items: center; cursor: pointer; margin: 0 4px 2px; }
.track { position: relative; height: 4px; width: 100%; border-radius: 999px; background: rgba(255,255,255,.28); overflow: hidden; transition: height .12s; }
.seek:hover .track, .seek:focus-visible .track { height: 6px; }
.buf { position: absolute; inset: 0 auto 0 0; background: rgba(255,255,255,.4); }
.played { position: absolute; inset: 0 auto 0 0; background: var(--fp-accent); border-radius: 999px; }
.thumb {
  position: absolute; top: 50%; width: 13px; height: 13px; border-radius: 50%;
  background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.5);
  transform: translate(-50%, -50%) scale(0); transition: transform .12s;
}
.seek:hover .thumb, .seek:focus-visible .thumb { transform: translate(-50%, -50%) scale(1); }
.volwrap { display: flex; align-items: center; }
.vol { width: 0; overflow: hidden; transition: width .2s cubic-bezier(.2,.7,.3,1); display: flex; align-items: center; }
.volwrap:hover .vol, .volwrap:focus-within .vol { width: 70px; }
.vol .seek { width: 62px; margin: 0 6px 0 2px; }

/* live badge */
.live {
  display: none; align-items: center; gap: 6px; padding: 4px 9px; margin-left: 4px;
  border-radius: 7px; font-size: 11px; font-weight: 700; letter-spacing: .05em;
  background: rgba(255,255,255,.14); cursor: pointer; border: none; color: rgba(255,255,255,.7);
  transition: color .15s, background .15s;
}
.wrap.live-on .live { display: inline-flex; }
.live:hover { background: rgba(255,255,255,.22); }
.live .dot { width: 7px; height: 7px; border-radius: 50%; background: #888; }
.wrap.at-edge .live { color: #fff; }
.wrap.at-edge .live .dot { background: #e5544b; box-shadow: 0 0 0 3px rgba(229,84,75,.25); }

/* settings popover */
.menu {
  position: absolute; right: 14px; bottom: 58px; min-width: 190px; padding: 6px;
  background: rgba(18,18,20,.94); backdrop-filter: blur(14px);
  border: 1px solid rgba(255,255,255,.08); border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0,0,0,.55);
  display: none; flex-direction: column; gap: 1px;
  /* Never overflow the player top — cap and scroll if the ladder is tall. */
  max-height: calc(100% - 72px); overflow-y: auto; overscroll-behavior: contain;
  transform-origin: bottom right; animation: fp-pop .14s ease;
}
.menu::-webkit-scrollbar { width: 8px; }
.menu::-webkit-scrollbar-thumb { background: rgba(255,255,255,.18); border-radius: 8px; }
.menu.open { display: flex; }
@keyframes fp-pop { from { opacity: 0; transform: translateY(6px) scale(.97); } }
.menu .mtitle { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; opacity: .5; padding: 8px 10px 3px; font-weight: 700; }
.menu button {
  appearance: none; border: none; background: none; color: #fff; text-align: left;
  padding: 8px 10px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500;
  display: flex; align-items: center; justify-content: space-between; gap: 14px;
}
.menu button:hover { background: rgba(255,255,255,.1); }
.menu button[aria-checked="true"] { color: var(--fp-accent); }
.menu button svg { width: 16px; height: 16px; fill: currentColor; }

.error {
  position: absolute; inset: 0; display: none; place-items: center; text-align: center;
  padding: 24px; background: rgba(0,0,0,.75); backdrop-filter: blur(2px);
}
.wrap.error .error { display: grid; }
.wrap.error .center, .wrap.error .controls, .wrap.error .gradient { display: none; }
.hidden { display: none !important; }
`;
