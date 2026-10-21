import { createApp } from './app.js';
import { createStore } from './core/store.js';

const store = createStore();
const app = createApp({ store });
app.start();

// Pede ao navegador para não apagar os dados locais por falta de espaço (pode ser negado; não é garantia).
navigator.storage?.persist?.().catch(() => {});

// Service worker: só em contexto seguro (https ou localhost).
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
