// Armazenamento local (localStorage). Os dados nunca saem do aparelho.
// Se os dados salvos estiverem corrompidos, o texto original é preservado em outra chave antes de recomeçar.

import { normalizeState } from './backup.js';
import { defaultState } from './defaults.js';

export const STORAGE_KEY = 'meu-eixo:dados';
export const CORRUPT_KEY = 'meu-eixo:dados-corrompidos';

/** localStorage se estiver disponível; senão, memória (e volatile=true para avisar o usuário). */
export function pickStorage() {
  try {
    const ls = globalThis.localStorage;
    const probe = '__meu-eixo-teste__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return memoryStorage();
  }
}

export function memoryStorage() {
  const map = new Map();
  return {
    volatile: true,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
  };
}

export function createStore(storage = pickStorage()) {
  const listeners = new Set();
  const status = { volatile: Boolean(storage.volatile), loadError: false, saveError: false, dropped: 0 };

  function load() {
    let raw = null;
    try {
      raw = storage.getItem(STORAGE_KEY);
    } catch {
      status.volatile = true;
    }
    if (!raw) return defaultState();
    try {
      const { state, dropped } = normalizeState(JSON.parse(raw));
      status.dropped = dropped;
      return state;
    } catch {
      status.loadError = true;
      try {
        storage.setItem(CORRUPT_KEY, raw);
      } catch {
        /* sem espaço: segue sem a cópia */
      }
      return defaultState();
    }
  }

  let state = load();

  function save() {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(state));
      status.saveError = false;
    } catch {
      status.saveError = true;
    }
  }

  function notify() {
    for (const fn of listeners) fn(state);
  }

  return {
    get: () => state,
    status: () => ({ ...status }),
    /** Altera o estado dentro de `mutator`, salva e avisa os ouvintes. */
    update(mutator) {
      const result = mutator(state);
      save();
      notify();
      return result;
    },
    /** Troca todos os dados (importação de backup ou apagar tudo). */
    replace(next) {
      state = next;
      save();
      notify();
    },
    reset() {
      this.replace(defaultState());
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
