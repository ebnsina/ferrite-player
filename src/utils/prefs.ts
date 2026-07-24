// Remembers a few playback preferences across sessions. Best-effort — storage
// can throw in private mode, so every access is guarded.

export interface Prefs {
  volume?: number;
  muted?: boolean;
  rate?: number;
  /** Last chosen caption language, or null when captions were turned off. */
  textLang?: string | null;
  /** Caption size: 'sm' | 'md' | 'lg'. */
  textSize?: 'sm' | 'md' | 'lg';
}

const KEY = 'ferrite-player:prefs';

export function loadPrefs(): Prefs {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') as Prefs;
  } catch {
    return {};
  }
}

export function savePrefs(patch: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...loadPrefs(), ...patch }));
  } catch {
    /* private mode / disabled storage */
  }
}
