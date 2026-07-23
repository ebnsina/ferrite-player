// Scoped styles for the shadow DOM skin. Uses CSS custom properties so hosts
// can theme it (--fp-accent, --fp-radius) without piercing the shadow boundary.
export const css = /* css */ `
:host {
  --fp-accent: #ff3e00;
  --fp-bg: #000;
  --fp-radius: 12px;
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
  font: 13px/1.4 system-ui, -apple-system, sans-serif;
  color: var(--fp-fg);
  user-select: none;
}
.wrap.fs { aspect-ratio: auto; height: 100%; border-radius: 0; }
video { width: 100%; height: 100%; display: block; background: #000; object-fit: contain; }
.gradient {
  position: absolute; inset: auto 0 0 0; height: 44%;
  background: linear-gradient(transparent, rgba(0,0,0,.7));
  pointer-events: none; opacity: 0; transition: opacity .2s;
}
.wrap.show .gradient, .wrap.paused .gradient { opacity: 1; }

/* center play / spinner */
.center {
  position: absolute; inset: 0; display: grid; place-items: center; pointer-events: none;
}
.big {
  width: 66px; height: 66px; border-radius: 50%;
  background: rgba(0,0,0,.45); backdrop-filter: blur(4px);
  display: grid; place-items: center; pointer-events: auto; cursor: pointer;
  border: none; color: #fff; transition: transform .15s, opacity .2s, background .15s;
}
.big:hover { background: var(--fp-accent); transform: scale(1.05); }
.wrap:not(.paused) .big { opacity: 0; pointer-events: none; }
.spinner {
  width: 42px; height: 42px; border-radius: 50%;
  border: 3px solid rgba(255,255,255,.25); border-top-color: #fff;
  animation: fp-spin .8s linear infinite; display: none;
}
.wrap.waiting .spinner { display: block; }
.wrap.waiting .big { display: none; }
@keyframes fp-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .spinner { animation-duration: 2s; } }

/* controls */
.controls {
  position: absolute; inset: auto 0 0 0; padding: 0 12px 8px;
  opacity: 0; transform: translateY(6px); transition: opacity .2s, transform .2s;
}
.wrap.show .controls, .wrap.paused .controls { opacity: 1; transform: none; }
.row { display: flex; align-items: center; gap: 6px; }
.spacer { flex: 1; }
button.ctl {
  appearance: none; border: none; background: none; color: #fff; cursor: pointer;
  width: 34px; height: 34px; border-radius: 8px; display: grid; place-items: center;
  transition: background .12s, color .12s;
}
button.ctl:hover { background: rgba(255,255,255,.15); }
button.ctl svg { width: 20px; height: 20px; fill: currentColor; }
.time { font-variant-numeric: tabular-nums; padding: 0 6px; opacity: .9; white-space: nowrap; }

/* seek + volume sliders */
.seek { position: relative; height: 16px; display: flex; align-items: center; cursor: pointer; margin: 2px 4px 4px; }
.track { position: relative; height: 4px; width: 100%; border-radius: 999px; background: rgba(255,255,255,.25); overflow: hidden; }
.seek:hover .track { height: 6px; }
.buf { position: absolute; inset: 0 auto 0 0; background: rgba(255,255,255,.35); }
.played { position: absolute; inset: 0 auto 0 0; background: var(--fp-accent); }
.thumb {
  position: absolute; top: 50%; width: 12px; height: 12px; border-radius: 50%;
  background: var(--fp-accent); transform: translate(-50%, -50%) scale(0); transition: transform .12s;
}
.seek:hover .thumb { transform: translate(-50%, -50%) scale(1); }
.vol { width: 0; overflow: hidden; transition: width .18s; display: flex; align-items: center; }
.volwrap:hover .vol, .volwrap:focus-within .vol { width: 64px; }
.vol .seek { width: 56px; margin: 0 4px; }

/* live badge */
.live {
  display: none; align-items: center; gap: 5px; padding: 3px 8px; margin-left: 2px;
  border-radius: 6px; font-size: 11px; font-weight: 600; letter-spacing: .04em;
  background: rgba(255,255,255,.12); cursor: pointer;
}
.wrap.live-on .live { display: inline-flex; }
.live .dot { width: 7px; height: 7px; border-radius: 50%; background: #888; }
.wrap.at-edge .live .dot { background: #e5544b; }
.wrap.at-edge .live { color: #fff; }

/* settings popover */
.menu {
  position: absolute; right: 12px; bottom: 52px; min-width: 180px; padding: 6px;
  background: rgba(20,20,22,.96); backdrop-filter: blur(8px); border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0,0,0,.5); display: none; flex-direction: column; gap: 2px;
}
.menu.open { display: flex; }
.menu .mtitle { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; opacity: .5; padding: 6px 8px 2px; }
.menu button {
  appearance: none; border: none; background: none; color: #fff; text-align: left;
  padding: 7px 8px; border-radius: 7px; cursor: pointer; font-size: 13px;
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
}
.menu button:hover { background: rgba(255,255,255,.1); }
.menu button[aria-checked="true"] { color: var(--fp-accent); }

.error {
  position: absolute; inset: 0; display: none; place-items: center; text-align: center;
  padding: 24px; background: rgba(0,0,0,.7);
}
.wrap.error .error { display: grid; }
.wrap.error .center, .wrap.error .controls, .wrap.error .gradient { display: none; }
.hidden { display: none !important; }
`;
