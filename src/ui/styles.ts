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

/* controls — single glassy bar (Video.js-style) with default + minimal modes */
.controls {
  position: absolute; inset: auto 0 0 0;
  opacity: 0; transform: translateY(8px); transition: opacity .25s, transform .25s;
}
.wrap.show .controls, .wrap.paused .controls { opacity: 1; transform: none; }
/* default: a contained glassy bar */
.bar {
  display: flex; align-items: center; gap: 3px;
  margin: 0 10px 10px; padding: 5px 8px;
  background: rgba(14,14,17,.4); backdrop-filter: blur(14px) saturate(1.4);
  border: 1px solid rgba(255,255,255,.08); border-radius: 16px;
}
/* minimal: no chrome — bare controls resting on the gradient scrim */
.wrap.minimal .bar {
  margin: 0 6px 4px; padding: 2px 4px; border-radius: 0;
  background: none; border: none; backdrop-filter: none; box-shadow: none;
}
.row { display: flex; align-items: center; gap: 4px; }
button.ctl {
  appearance: none; border: none; background: none; color: rgba(255,255,255,.9); cursor: pointer;
  width: 36px; height: 36px; border-radius: 999px; display: grid; place-items: center;
  transition: background .12s, transform .1s, color .12s; flex: none;
}
button.ctl.sm { width: 32px; height: 32px; color: rgba(255,255,255,.72); }
button.ctl:hover { background: rgba(255,255,255,.15); color: #fff; }
button.ctl:active { transform: scale(.92); }
button.ctl svg { width: 22px; height: 22px; fill: currentColor; }
button.ctl.sm svg { width: 20px; height: 20px; }
.time { font-variant-numeric: tabular-nums; padding: 0 8px; opacity: .9; white-space: nowrap; letter-spacing: .01em; font-size: 12.5px; flex: none; }
.time.rem { display: none; }
.wrap.minimal .time.rem { display: inline; }

/* seek + volume sliders */
.bar > .seek { flex: 1; min-width: 40px; margin: 0 8px; }
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
.wrap.error .center, .wrap.error .controls, .wrap.error .gradient, .wrap.error .brand { display: none; }
.btn-retry {
  display: inline-flex; align-items: center; gap: 8px; padding: 9px 16px; border: none;
  border-radius: 10px; cursor: pointer; background: var(--fp-accent); color: #fff;
  font: 600 13px system-ui; transition: filter .15s;
}
.btn-retry svg { width: 18px; height: 18px; fill: currentColor; }
.btn-retry:hover { filter: brightness(1.08); }

/* brand — corner mark that fades in with the controls */
.brand {
  position: absolute; top: 14px; left: 16px; z-index: 3; display: flex; align-items: center; gap: 8px;
  opacity: 0; transform: translateY(-6px); transition: opacity .25s, transform .25s; pointer-events: none;
}
.wrap.show .brand, .wrap.paused .brand { opacity: 1; transform: none; }
.brand svg { width: 24px; height: 24px; filter: drop-shadow(0 2px 6px rgba(0,0,0,.5)); }
.brand > span { font-weight: 700; font-size: 13.5px; letter-spacing: -.01em; text-shadow: 0 1px 4px rgba(0,0,0,.6); }
.brand .pw { opacity: .72; font-weight: 500; }

/* seek hover / scrub preview (time bubble + storyboard thumbnail) */
.preview {
  position: absolute; bottom: calc(100% + 8px); left: 0; transform: translateX(-50%);
  display: none; flex-direction: column; align-items: center; gap: 6px; pointer-events: none;
}
.seek.previewing .preview { display: flex; }
.preview-img {
  border-radius: 8px; border: 1px solid rgba(255,255,255,.18);
  background: #000 center / cover no-repeat; box-shadow: 0 10px 30px rgba(0,0,0,.55); overflow: hidden;
}
.preview-time {
  font: 600 12px/1 system-ui; padding: 4px 8px; border-radius: 6px;
  background: rgba(10,10,12,.88); font-variant-numeric: tabular-nums; letter-spacing: .01em;
}

/* double-tap seek ripples (touch) */
.ripple {
  position: absolute; top: 50%; transform: translateY(-50%); padding: 12px 18px; border-radius: 40px;
  background: rgba(0,0,0,.5); backdrop-filter: blur(4px); font-weight: 700; font-size: 14px;
  animation: fp-ripple .55s ease forwards; pointer-events: none; z-index: 4;
}
.ripple.fwd { right: 7%; } .ripple.back { left: 7%; }
@keyframes fp-ripple { from { opacity: 0; transform: translateY(-50%) scale(.85); } 30% { opacity: 1; } to { opacity: 0; } }

/* touch: no hover, so drop the expand-on-hover volume slider (keep mute) */
.wrap.touch .vol { display: none !important; }
.wrap.touch button.ctl { width: 42px; height: 42px; }

/* chapter markers on the seek track */
.chapters { position: absolute; inset: 0; pointer-events: none; }
.cmark { position: absolute; top: 0; bottom: 0; width: 2px; margin-left: -1px; background: rgba(0,0,0,.55); }
.preview-chap { display: none; max-width: 200px; font: 600 11px/1.3 system-ui; text-align: center; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,.7); padding: 0 4px; }

/* tap-to-unmute pill (after muted autoplay) */
.unmute {
  position: absolute; top: 14px; left: 50%; transform: translateX(-50%);
  display: none; align-items: center; gap: 7px; padding: 8px 14px; border: none; cursor: pointer;
  border-radius: 999px; background: rgba(10,10,12,.7); backdrop-filter: blur(6px); color: #fff;
  font: 600 12px system-ui; box-shadow: 0 6px 20px rgba(0,0,0,.4); pointer-events: auto;
}
.unmute.show { display: inline-flex; }
.unmute svg { width: 17px; height: 17px; fill: currentColor; }

/* caption sizing (native ::cue + adaptive-engine text container) */
video::cue { font-size: 1.1em; background: rgba(0,0,0,.75); }
.wrap.cue-sm video::cue { font-size: 0.85em; }
.wrap.cue-lg video::cue { font-size: 1.5em; }
.wrap.cue-sm .shaka-text-container { font-size: 2.2vmin !important; }
.wrap.cue-md .shaka-text-container { font-size: 3vmin !important; }
.wrap.cue-lg .shaka-text-container { font-size: 4.2vmin !important; }

.hidden { display: none !important; }
`;
