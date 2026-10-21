// Mobilidade leve e mindfulness: cartões curtos com instruções e opção de concluir.

import { uid } from '../core/defaults.js';
import { CARE_NOTE, MINDFULNESS_CARDS, MOBILITY_CARDS } from '../core/content.js';
import { clockOf, dateKey } from '../core/time.js';
import { h } from '../ui/dom.js';
import { btn, card, primaryBtn, recordItem } from '../ui/widgets.js';
import { removeRecord } from './actions.js';

function complete(app, c) {
  const today = dateKey(new Date(app.now()));
  app.store.update((s) => s.logs.mobility.push({ id: uid(), date: today, ts: app.now(), cardId: c.id, kind: c.kind, title: c.title }));
  app.toast(`“${c.title}” concluído.`);
}

function cardView(app, c, doneToday) {
  const open = app.ui.openCard === c.id;
  return h(
    'section',
    { class: 'card' },
    h('div', { class: 'card-head' }, h('h2', null, c.title), h('span', { class: 'pill' }, `${c.minutes} min`)),
    doneToday ? h('p', { class: 'muted' }, `Concluído ${doneToday}× hoje`) : null,
    open ? h('ol', { class: 'plain' }, c.steps.map((s) => h('li', null, s))) : null,
    h(
      'div',
      { class: 'grid2' },
      btn(open ? 'Ocultar passos' : 'Ver passos', () => { app.ui.openCard = open ? null : c.id; app.refresh(); }, '', { 'aria-expanded': open }),
      primaryBtn('Concluir', () => complete(app, c)),
    ),
  );
}

export function renderMobility(app) {
  const state = app.store.get();
  const today = dateKey(new Date(app.now()));
  const counts = {};
  for (const m of state.logs.mobility) if (m.date === today) counts[m.cardId] = (counts[m.cardId] ?? 0) + 1;

  return [
    h('section', { class: 'card note' }, h('p', null, CARE_NOTE)),
    h('h2', null, 'Mobilidade'),
    ...MOBILITY_CARDS.map((c) => cardView(app, c, counts[c.id] ?? 0)),
    h('h2', null, 'Mindfulness'),
    ...MINDFULNESS_CARDS.map((c) => cardView(app, c, counts[c.id] ?? 0)),
    card(
      'Feitos hoje',
      state.logs.mobility.some((m) => m.date === today)
        ? h('div', { class: 'list' }, state.logs.mobility.filter((m) => m.date === today).sort((a, b) => b.ts - a.ts).map((m) => recordItem({ title: m.title || m.cardId, meta: `às ${clockOf(m.ts)}`, onDelete: () => removeRecord(app, 'mobility', m.id, 'Registro') })))
        : h('p', { class: 'muted' }, 'Nada concluído hoje ainda. Sem pressa.'),
    ),
  ];
}
