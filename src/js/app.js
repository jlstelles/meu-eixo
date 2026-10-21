// Aplicação: roteador por hash, navegação inferior e avisos de lembrete (só com o app aberto).

import { dueReminders } from './core/reminders.js';
import { dateKey, formatDateLong } from './core/time.js';
import { h, icon } from './ui/dom.js';
import { showSystemNotification } from './ui/notify.js';
import { closeAllSheets } from './ui/sheet.js';
import { toast } from './ui/toast.js';
import { renderBreaks } from './views/breaks.js';
import { renderHealth } from './views/health.js';
import { renderMeals } from './views/meals.js';
import { renderMobility } from './views/mobility.js';
import { renderMore } from './views/more.js';
import { renderMove } from './views/move.js';
import { renderMusic } from './views/music.js';
import { renderSettings } from './views/settings.js';
import { renderSleep } from './views/sleep.js';
import { renderToday } from './views/today.js';
import { renderWater } from './views/water.js';

export const ROUTES = [
  { path: '/', title: 'Hoje', tab: '/', render: renderToday },
  { path: '/agua', title: 'Água', tab: '/agua', render: renderWater },
  { path: '/comer', title: 'Alimentação', tab: '/comer', render: renderMeals },
  { path: '/mexer', title: 'Movimento', tab: '/mexer', render: renderMove },
  { path: '/mais', title: 'Mais', tab: '/mais', render: renderMore },
  { path: '/sono', title: 'Sono', tab: '/mais', back: true, render: renderSleep },
  { path: '/pausas', title: 'Pausas e lembretes', tab: '/mais', back: true, render: renderBreaks },
  { path: '/mobilidade', title: 'Mobilidade e mindfulness', tab: '/mais', back: true, render: renderMobility },
  { path: '/saude', title: 'Pressão e batimentos', tab: '/mais', back: true, render: renderHealth },
  { path: '/musica', title: 'Música e foco', tab: '/mais', back: true, render: renderMusic },
  { path: '/ajustes', title: 'Ajustes e backup', tab: '/mais', back: true, render: renderSettings },
];

const TABS = [
  { path: '/', label: 'Hoje', icon: 'home' },
  { path: '/agua', label: 'Água', icon: 'water' },
  { path: '/comer', label: 'Comer', icon: 'food' },
  { path: '/mexer', label: 'Mexer', icon: 'move' },
  { path: '/mais', label: 'Mais', icon: 'more' },
];

export function createApp({ store, now = () => Date.now() }) {
  const els = {
    main: document.getElementById('conteudo'),
    title: document.getElementById('titulo'),
    sub: document.getElementById('subtitulo'),
    tabs: document.getElementById('abas'),
    banner: document.getElementById('banner'),
  };
  let cleanups = [];
  const fired = new Set();
  const dismissed = new Set();

  const app = {
    store,
    now,
    toast,
    ui: {},
    navigate(path) {
      if (currentPath() === path) paint(false);
      else location.hash = `#${path}`;
    },
    refresh: () => paint(false),
    /** Registra algo a limpar quando a tela for redesenhada (ex.: setInterval). */
    onCleanup(fn) {
      cleanups.push(fn);
    },
  };

  function currentPath() {
    return location.hash.replace(/^#/, '') || '/';
  }

  function runCleanups() {
    const list = cleanups;
    cleanups = [];
    for (const fn of list) fn();
  }

  function paint(routeChanged) {
    const route = ROUTES.find((r) => r.path === currentPath()) ?? ROUTES[0];
    runCleanups();
    if (routeChanged) closeAllSheets();
    const view = route.render(app);
    const nodes = [].concat(view).filter(Boolean);
    if (route.back) nodes.unshift(h('a', { class: 'btn btn-quiet', href: '#/mais' }, '← Mais'));
    els.main.replaceChildren(...nodes);
    els.title.textContent = route.title;
    els.sub.textContent = formatDateLong(dateKey(new Date(now())));
    document.title = route.path === '/' ? 'Meu Eixo' : `${route.title} · Meu Eixo`;
    for (const a of els.tabs.querySelectorAll('a')) {
      if (a.dataset.path === route.tab) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
    if (routeChanged) {
      window.scrollTo?.(0, 0);
      els.main.focus({ preventScroll: true });
    }
  }

  function buildTabs() {
    els.tabs.replaceChildren(
      ...TABS.map((t) => h('a', { href: `#${t.path}`, 'data-path': t.path }, icon(t.icon), h('span', null, t.label))),
    );
  }

  function notifySystem(r) {
    if (!store.get().settings.notifications) return;
    showSystemNotification({ title: r.title, body: r.body, tag: r.id });
  }

  function checkReminders() {
    const due = dueReminders(store.get(), now());
    for (const r of due) {
      if (!fired.has(r.key)) {
        fired.add(r.key);
        notifySystem(r);
      }
    }
    const show = due.find((r) => !dismissed.has(r.key));
    if (!show) {
      els.banner.replaceChildren();
      return;
    }
    els.banner.replaceChildren(
      h(
        'div',
        { class: 'banner' },
        h('p', null, h('strong', null, show.title), ' ', show.body),
        h('button', { type: 'button', class: 'btn-primary btn-sm', on: { click: () => { dismissed.add(show.key); checkReminders(); app.navigate(show.route); } } }, 'Abrir'),
        h('button', { type: 'button', class: 'btn-sm', on: { click: () => { dismissed.add(show.key); checkReminders(); } } }, 'Dispensar'),
      ),
    );
  }

  /** Inicia roteamento e verificação de lembretes. Retorna uma função que desfaz tudo (usada nos testes). */
  function start() {
    buildTabs();
    const onHash = () => paint(true);
    window.addEventListener('hashchange', onHash);
    const unsubscribe = store.subscribe(() => {
      paint(false);
      checkReminders();
    });
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        paint(false);
        checkReminders();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    const timer = setInterval(checkReminders, 30_000);
    paint(true);
    checkReminders();
    return () => {
      clearInterval(timer);
      window.removeEventListener('hashchange', onHash);
      document.removeEventListener('visibilitychange', onVisible);
      unsubscribe();
      runCleanups();
    };
  }

  app.start = start;
  return app;
}
