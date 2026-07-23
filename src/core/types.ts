// Public types shared across the engine, store, and UI.

/** A selectable quality level (variant), sorted highest-first by the engine. */
export interface Quality {
  id: number;
  height: number | null;
  bitrate: number;
  label: string;
}

/** A selectable subtitle/caption track. */
export interface TextTrack {
  id: number;
  language: string;
  label: string;
}

/** DRM configuration passed through to Shaka. */
export interface DrmConfig {
  /** key-system → license server URL, e.g. `{ 'com.widevine.alpha': '…' }`. */
  servers?: Record<string, string>;
  /** Apple FairPlay (HLS on Safari). */
  fairplay?: { licenseUrl: string; certificateUri?: string };
}

/** A side-loaded subtitle/caption file (WebVTT or SubRip). */
export interface SubtitleSource {
  url: string;
  /** BCP-47 language code, e.g. `en`, `es`. */
  language: string;
  label?: string;
  kind?: 'subtitles' | 'captions';
  /** Force SubRip parsing when the URL has no `.srt` extension. */
  srt?: boolean;
  default?: boolean;
}

export interface LoadOptions {
  live?: boolean;
  lowLatency?: boolean;
  drm?: DrmConfig;
  /** Start muted (required for programmatic autoplay in most browsers). */
  autoplay?: boolean;
  /** Side-loaded subtitles (VTT or SRT), on top of any in-manifest tracks. */
  subtitles?: SubtitleSource[];
  /** WebVTT storyboard URL for hover seek previews (cues → `sprite#xywh`). */
  thumbnails?: string;
}

/** Which playback engine handled the current source. */
export type EngineKind = 'native' | 'mse';

/** Reactive player state the UI binds to. */
export interface PlayerState {
  src: string | null;
  engine: EngineKind | null;
  paused: boolean;
  ended: boolean;
  waiting: boolean;
  seeking: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  volume: number;
  muted: boolean;
  rate: number;
  fullscreen: boolean;
  pip: boolean;
  live: boolean;
  atLiveEdge: boolean;
  qualities: Quality[];
  /** -1 = auto (ABR). */
  currentQuality: number;
  textTracks: TextTrack[];
  currentText: number; // -1 = off
  error: string | null;
}

export const initialState: PlayerState = {
  src: null,
  engine: null,
  paused: true,
  ended: false,
  waiting: false,
  seeking: false,
  currentTime: 0,
  duration: 0,
  buffered: 0,
  volume: 1,
  muted: false,
  rate: 1,
  fullscreen: false,
  pip: false,
  live: false,
  atLiveEdge: true,
  qualities: [],
  currentQuality: -1,
  textTracks: [],
  currentText: -1,
  error: null,
};
