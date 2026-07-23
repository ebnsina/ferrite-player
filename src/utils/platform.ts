// Capability + platform detection. Kept tiny and side-effect-free so the core
// can decide native-vs-MSE without pulling in the streaming engine.

const nav = typeof navigator !== 'undefined' ? navigator : undefined;
const win = typeof window !== 'undefined' ? window : undefined;
const ua = nav?.userAgent ?? '';

export const isIOS =
  /iP(hone|ad|od)/.test(ua) ||
  // iPadOS reports as Mac; disambiguate via touch points.
  (/Macintosh/.test(ua) && (nav?.maxTouchPoints ?? 0) > 1);

export const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
export const hasTouch = !!win && ('ontouchstart' in win || (nav?.maxTouchPoints ?? 0) > 0);

/** MediaSource (or iOS ManagedMediaSource) — required for the Shaka/MSE path. */
export function supportsMSE(): boolean {
  return (
    typeof win?.MediaSource !== 'undefined' ||
    typeof (win as unknown as { ManagedMediaSource?: unknown })?.ManagedMediaSource !== 'undefined'
  );
}

/** Whether the media element can play HLS natively (Safari / iOS). */
export function supportsNativeHls(media?: HTMLMediaElement | null): boolean {
  const el = media ?? (typeof document !== 'undefined' ? document.createElement('video') : null);
  if (!el) return false;
  const can = el.canPlayType('application/vnd.apple.mpegurl');
  return can === 'probably' || can === 'maybe';
}

/** Picture-in-Picture availability (spec API or WebKit presentation mode). */
export function supportsPiP(): boolean {
  return (
    (typeof document !== 'undefined' && (document as Document).pictureInPictureEnabled === true) ||
    typeof (win as unknown as { WebKitPlaybackTargetAvailabilityEvent?: unknown })
      ?.WebKitPlaybackTargetAvailabilityEvent !== 'undefined'
  );
}

/** AirPlay availability (Safari / WebKit only). */
export function supportsAirPlay(): boolean {
  return (
    typeof (win as unknown as { WebKitPlaybackTargetAvailabilityEvent?: unknown })
      ?.WebKitPlaybackTargetAvailabilityEvent !== 'undefined'
  );
}
