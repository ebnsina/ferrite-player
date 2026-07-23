// Shaka wrapper — dynamically imported by the engine, so Shaka only downloads
// when a stream actually needs MSE. Exposes just what the engine consumes.
import shaka from 'shaka-player';
import type { DrmConfig, Quality, TextTrack } from './types';

let polyfilled = false;

export interface ShakaController {
  getQualities(): Quality[];
  selectQuality(id: number): void; // -1 = auto (ABR)
  getTextTracks(): TextTrack[];
  selectText(id: number): void; // -1 = off
  isLive(): boolean;
  liveEdge(): number;
  on(event: string, cb: () => void): void;
  destroy(): Promise<void>;
}

async function fairplayCert(uri: string): Promise<Uint8Array> {
  const r = await fetch(uri);
  if (!r.ok) throw new Error(`FairPlay cert fetch failed: ${r.status}`);
  return new Uint8Array(await r.arrayBuffer());
}

/** Attach Shaka to `video` and load `url`. Throws on unsupported browser / load error. */
export async function loadShaka(
  video: HTMLVideoElement,
  url: string,
  opts?: { lowLatency?: boolean; drm?: DrmConfig },
): Promise<ShakaController> {
  if (!polyfilled) {
    polyfilled = true;
    shaka.polyfill.installAll();
  }
  if (!shaka.Player.isBrowserSupported()) {
    throw new Error('This browser does not support MSE/EME playback.');
  }

  const player = new shaka.Player();
  await player.attach(video);

  const config: Record<string, unknown> = {
    streaming: { lowLatencyMode: !!opts?.lowLatency },
    abr: { enabled: true },
  };
  if (opts?.drm?.servers) config.drm = { servers: opts.drm.servers };
  player.configure(config);

  if (opts?.drm?.fairplay) {
    const fp = opts.drm.fairplay;
    const cert = fp.certificateUri ? await fairplayCert(fp.certificateUri) : undefined;
    player.configure({
      drm: {
        servers: { 'com.apple.fps': fp.licenseUrl },
        advanced: { 'com.apple.fps': { serverCertificate: cert } },
      },
    });
  }

  await player.load(url);

  const label = (t: { height: number | null; bandwidth: number }) =>
    t.height ? `${t.height}p` : `${Math.round(t.bandwidth / 1000)}k`;

  return {
    getQualities() {
      // Variants combine audio+video, so many share a resolution. Keep one entry
      // per height (the highest-bitrate rendition) for a clean quality menu.
      const byHeight = new Map<number, Quality>();
      for (const t of player.getVariantTracks()) {
        const key = t.height ?? -1;
        const existing = byHeight.get(key);
        if (!existing || t.bandwidth > existing.bitrate) {
          byHeight.set(key, { id: t.id, height: t.height, bitrate: t.bandwidth, label: label(t) });
        }
      }
      return [...byHeight.values()].sort((a, b) => b.bitrate - a.bitrate);
    },
    selectQuality(id) {
      if (id < 0) {
        player.configure({ abr: { enabled: true } });
        return;
      }
      const track = player.getVariantTracks().find((t) => t.id === id);
      if (track) {
        player.configure({ abr: { enabled: false } });
        player.selectVariantTrack(track, true);
      }
    },
    getTextTracks() {
      return player
        .getTextTracks()
        .map((t) => ({ id: t.id, language: t.language, label: t.label || t.language || 'Unknown' }));
    },
    selectText(id) {
      if (id < 0) {
        player.setTextTrackVisibility(false);
        return;
      }
      const track = player.getTextTracks().find((t) => t.id === id);
      if (track) {
        player.selectTextTrack(track);
        player.setTextTrackVisibility(true);
      }
    },
    isLive: () => player.isLive(),
    liveEdge: () => player.seekRange().end,
    on(event, cb) {
      player.addEventListener(event, cb);
    },
    destroy: () => player.destroy(),
  };
}
