// Shaka wrapper — dynamically imported by the engine, so Shaka only downloads
// when a stream actually needs MSE. Exposes just what the engine consumes.
import shaka from 'shaka-player';
import type { AudioTrack, DrmConfig, Quality, TextTrack } from './types';

let polyfilled = false;

export interface ShakaController {
  getQualities(): Quality[];
  selectQuality(id: number): void; // -1 = auto (ABR)
  getTextTracks(): TextTrack[];
  selectText(id: number): void; // -1 = off
  /** Side-load an external subtitle file (already normalised to WebVTT). */
  addText(url: string, language: string, kind: string, mime: string, label?: string): Promise<void>;
  getAudioTracks(): AudioTrack[];
  currentAudio(): number;
  selectAudio(id: number): void;
  isLive(): boolean;
  liveEdge(): number;
  on(event: string, cb: () => void): void;
  destroy(): Promise<void>;
}

/** BCP-47 code → human label, e.g. `en` → "English" (falls back to the code). */
function languageName(code: string): string {
  try {
    return (
      new Intl.DisplayNames([navigator.language || 'en'], { type: 'language' }).of(code) ?? code
    );
  } catch {
    return code;
  }
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
      return player.getTextTracks().map((t) => ({
        id: t.id,
        language: t.language,
        label: t.label || t.language || 'Unknown',
      }));
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
    async addText(url, language, kind, mime, label) {
      const p = player as unknown as {
        addTextTrackAsync: (
          u: string,
          l: string,
          k: string,
          m: string,
          c?: string,
          lab?: string,
        ) => Promise<unknown>;
      };
      await p.addTextTrackAsync(url, language, kind, mime, undefined, label);
    },
    getAudioTracks() {
      // One entry per distinct audio language (variants repeat it per quality).
      const seen = new Map<string, AudioTrack>();
      let i = 0;
      for (const t of player.getVariantTracks()) {
        const lang = t.language || 'und';
        if (seen.has(lang)) continue;
        seen.set(lang, { id: i++, language: lang, label: t.label || languageName(lang) });
      }
      return [...seen.values()];
    },
    currentAudio() {
      const active = player.getVariantTracks().find((t) => t.active);
      if (!active) return -1;
      const langs = [...new Set(player.getVariantTracks().map((t) => t.language || 'und'))];
      return langs.indexOf(active.language || 'und');
    },
    selectAudio(id) {
      const langs = [...new Set(player.getVariantTracks().map((t) => t.language || 'und'))];
      const lang = langs[id];
      if (lang) player.selectAudioLanguage(lang);
    },
    isLive: () => player.isLive(),
    liveEdge: () => player.seekRange().end,
    on(event, cb) {
      player.addEventListener(event, cb);
    },
    destroy: () => player.destroy(),
  };
}
