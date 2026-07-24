// Google Cast (Chromecast). The sender SDK is loaded lazily on first use, so
// it never bloats the core bundle and only Chromium users ever fetch it.
// Everything is guarded — if Cast is unavailable, this quietly no-ops.

/* Cast's sender SDK ships no types; a narrow local shape keeps us honest. */
// biome-ignore lint/suspicious/noExplicitAny: the injected Cast SDK is untyped
type Any = any;

const SDK = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';

let loading: Promise<boolean> | null = null;

function loadSdk(): Promise<boolean> {
  if (loading) return loading;
  loading = new Promise<boolean>((resolve) => {
    const w = window as Any;
    if (w.cast?.framework) return resolve(true);
    if (!w.chrome) return resolve(false); // non-Chromium never gets Cast
    w.__onGCastApiAvailable = (available: boolean) => resolve(!!available);
    const s = document.createElement('script');
    s.src = SDK;
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
    setTimeout(() => resolve(!!(window as Any).cast?.framework), 4000);
  });
  return loading;
}

export interface CastController {
  available(): boolean;
  connected(): boolean;
  /** Start casting `src` (or stop if already connected). */
  toggle(src: string | null): Promise<void>;
  destroy(): void;
}

function mimeFor(src: string): string {
  if (/\.m3u8($|\?)/i.test(src)) return 'application/x-mpegurl';
  if (/\.mpd($|\?)/i.test(src)) return 'application/dash+xml';
  return 'video/mp4';
}

/** Initialise Cast; `onChange` fires when availability/connection changes. */
export async function initCast(onChange: () => void): Promise<CastController | null> {
  if (!(await loadSdk())) return null;
  const w = window as Any;
  const cast = w.cast;
  const chrome = w.chrome;
  if (!cast?.framework || !chrome?.cast) return null;

  const context = cast.framework.CastContext.getInstance();
  context.setOptions({
    receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
    autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
  });

  const State = cast.framework.CastState;
  const state = () => context.getCastState();
  const listener = () => onChange();
  context.addEventListener(cast.framework.CastContextEventType.CAST_STATE_CHANGED, listener);

  return {
    available: () => state() !== State.NO_DEVICES_AVAILABLE,
    connected: () => state() === State.CONNECTED,
    async toggle(src) {
      if (context.getCurrentSession()) {
        await context.endCurrentSession(true);
        return;
      }
      if (!src) return;
      await context.requestSession();
      const session = context.getCurrentSession();
      if (!session) return;
      const info = new chrome.cast.media.MediaInfo(src, mimeFor(src));
      await session.loadMedia(new chrome.cast.media.LoadRequest(info));
    },
    destroy() {
      context.removeEventListener(cast.framework.CastContextEventType.CAST_STATE_CHANGED, listener);
    },
  };
}
