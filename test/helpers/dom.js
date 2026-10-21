// Ambiente de teste de interface: jsdom (DOM simulado, NÃO é um navegador real nem Android).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const html = readFileSync(join(root, 'src', 'index.html'), 'utf8');

const GLOBALS = ['window', 'document', 'Node', 'HTMLElement', 'location', 'navigator', 'Event'];

function install(win) {
  const values = { window: win, document: win.document, Node: win.Node, HTMLElement: win.HTMLElement, location: win.location, navigator: win.navigator, Event: win.Event };
  for (const name of GLOBALS) Object.defineProperty(globalThis, name, { value: values[name], configurable: true, writable: true });
}

export const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

export async function boot({ at = new Date(2026, 9, 20, 10, 0).getTime(), state = null, hash = '' } = {}) {
  const dom = new JSDOM(html, { url: `http://localhost/${hash}`, pretendToBeVisual: true });
  const win = dom.window;
  win.scrollTo = () => {};
  install(win);

  const { createStore, memoryStorage, STORAGE_KEY } = await import('../../src/js/core/store.js');
  const { createApp } = await import('../../src/js/app.js');
  const storage = memoryStorage();
  if (state) storage.setItem(STORAGE_KEY, JSON.stringify(state));
  const store = createStore(storage);
  const clock = { t: at };
  const app = createApp({ store, now: () => clock.t });
  const stop = app.start();

  const doc = win.document;
  const env = {
    app, store, clock, win, doc, storage,
    $: (sel, root = doc) => root.querySelector(sel),
    $$: (sel, root = doc) => [...root.querySelectorAll(sel)],
    /** Primeiro elemento que casa com o seletor e cujo texto contém `text`. */
    byText(sel, text, root = doc) {
      return [...root.querySelectorAll(sel)].find((el) => el.textContent.includes(text)) ?? null;
    },
    click(el) {
      if (!el) throw new Error('Elemento para clicar não encontrado');
      el.click();
    },
    async clickText(sel, text) {
      env.click(env.byText(sel, text));
      await tick();
    },
    set(el, value) {
      el.value = value;
      el.dispatchEvent(new win.Event('input', { bubbles: true }));
      el.dispatchEvent(new win.Event('change', { bubbles: true }));
    },
    /** Preenche um campo da folha aberta pelo atributo name. */
    field(name) {
      return doc.querySelector(`.sheet [name="${name}"]`);
    },
    async submitSheet() {
      env.click(doc.querySelector('.sheet button[type="submit"]'));
      await tick(5);
    },
    sheetOpen: () => Boolean(doc.querySelector('.sheet')),
    async go(path) {
      win.location.hash = `#${path}`;
      await tick(5);
    },
    main: () => doc.getElementById('conteudo'),
    text: () => doc.getElementById('conteudo').textContent,
    stop() {
      stop();
      win.close();
    },
  };
  await tick();
  return env;
}
