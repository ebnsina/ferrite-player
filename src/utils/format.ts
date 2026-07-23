import type { EngineKind, LoadOptions } from '../core/types';
import { supportsMSE, supportsNativeHls } from './platform';

/**
 * Decide which engine plays a URL:
 * - `.mpd` (DASH) → always MSE (Shaka).
 * - `.m3u8` (HLS) → native where the browser can (Safari/iOS), else MSE.
 * - low-latency live → MSE (finer buffer control).
 * - anything else (`.mp4`, `.webm`, …) → native.
 */
export function classify(url: string, media: HTMLMediaElement | null, opts?: LoadOptions): EngineKind {
  const path = url.split('?')[0]?.toLowerCase() ?? '';
  if (opts?.lowLatency) return supportsMSE() ? 'mse' : 'native';
  if (path.endsWith('.mpd')) return 'mse';
  if (path.endsWith('.m3u8')) {
    return supportsNativeHls(media) ? 'native' : 'mse';
  }
  return 'native';
}
