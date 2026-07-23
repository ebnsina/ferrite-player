// Inline SVG icon paths (24×24, fill=currentColor). Small, dependency-free.
const svg = (p: string) => `<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;

export const icons = {
  play: svg('<path d="M8 5v14l11-7z"/>'),
  pause: svg('<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>'),
  replay: svg('<path d="M12 5V1L7 6l5 5V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/>'),
  volume: svg('<path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4z"/>'),
  muted: svg('<path d="M3 10v4h4l5 5V5L7 10H3zm13.6-2.6-1.4 1.4L17.2 11l-2 2 1.4 1.4 2-2 2 2 1.4-1.4-2-2 2-2-1.4-1.4-2 2z"/>'),
  settings: svg('<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8.4 4-1.8-1a6.9 6.9 0 0 0 0-2l1.8-1-2-3.4-2 .9a7 7 0 0 0-1.7-1L14.3 1H9.7l-.4 2.1a7 7 0 0 0-1.7 1l-2-.9-2 3.4 1.8 1a6.9 6.9 0 0 0 0 2l-1.8 1 2 3.4 2-.9c.5.4 1.1.8 1.7 1l.4 2.1h4.6l.4-2.1c.6-.2 1.2-.6 1.7-1l2 .9 2-3.4z"/>'),
  captions: svg('<path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm3 7h4v-1H8V9h3V8H7v4zm6 0h4v-1h-3V9h3V8h-4v4z"/>'),
  pip: svg('<path d="M19 7h-8v6h8V7zm2-4H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H3V5h18v14z"/>'),
  enterFs: svg('<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>'),
  exitFs: svg('<path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>'),
  check: svg('<path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/>'),
  chevron: svg('<path d="M8.6 16.6 13.2 12 8.6 7.4 10 6l6 6-6 6z"/>'),
};
