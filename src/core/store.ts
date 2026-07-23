// A minimal reactive store — get / set (shallow merge) / subscribe. No deps; the
// UI subscribes once and re-renders on change.

export type Store<T> = {
  get(): Readonly<T>;
  set(patch: Partial<T>): void;
  subscribe(listener: () => void): () => void;
};

export function createStore<T extends object>(initial: T): Store<T> {
  let state = { ...initial };
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(patch) {
      // Skip the notify if nothing actually changed (cheap shallow compare).
      let changed = false;
      for (const k in patch) {
        if (!Object.is(state[k as keyof T], patch[k as keyof T])) {
          changed = true;
          break;
        }
      }
      if (!changed) return;
      state = { ...state, ...patch };
      for (const l of listeners) l();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
