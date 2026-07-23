// Public entry: registers <ferrite-player> and re-exports the types + engine.
import { FerritePlayer } from './core/element';

if (typeof customElements !== 'undefined' && !customElements.get('ferrite-player')) {
  customElements.define('ferrite-player', FerritePlayer);
}

export { FerritePlayer };
export { Engine } from './core/engine';
export { classify } from './utils/format';
export type {
  PlayerState,
  Quality,
  TextTrack,
  LoadOptions,
  DrmConfig,
  EngineKind,
} from './core/types';

declare global {
  interface HTMLElementTagNameMap {
    'ferrite-player': FerritePlayer;
  }
}
