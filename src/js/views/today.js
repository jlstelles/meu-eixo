// Painel "Hoje": próxima ação, ações rápidas e resumo simples do dia.

import { PLAYLIST_KINDS, SCALES } from '../core/defaults.js';
import { activityMinutes, latestCheckin, mealsDone, sleepTotal, waterTotal } from '../core/metrics.js';
import { nextAction, plannedToday } from '../core/next-action.js';
import { atLabel, breakStatus } from '../core/reminders.js';
import { dateKey, formatDuration } from '../core/time.js';
import { h } from '../ui/dom.js';
import { btn, card, meter, primaryBtn } from '../ui/widgets.js';
import { addWater, markBreakDone, openCheckin } from './actions.js';

const row = (label, value, href, onClick = null) =>
  h(
    'a',
    {
      class: 'item link-row',
      href: `#${href}`,
      on: onClick ? { click: (ev) => { ev.preventDefault(); onClick(); } } : null,
    },
    h('div', { class: 'grow' }, h('div', { class: 'title' }, label), h('div', { class: 'muted' }, value)),
    h('span', { 'aria-hidden': 'true' }, '›'),
  );

function checkinSummary(c) {
  if (!c) return 'Sem check-in hoje';
  return Object.entries(SCALES)
    .map(([k, sc]) => `${sc.label} ${c[k]}`)
    .join(' · ');
}

export function renderToday(app) {
  const { store } = app;
  const state = store.get();
  const t = app.now();
  const today = dateKey(new Date(t));
  const nodes = [];

  if (!state.meta.welcomed) {
    nodes.push(
      h(
        'section',
        { class: 'card note' },
        h('h2', null, 'Bem-vindo ao Meu Eixo'),
        h('p', null, 'Seus dados ficam só neste aparelho e não são enviados a ninguém. Se trocar de celular ou limpar os dados do navegador, eles somem: use Mais → Ajustes e backup para exportar uma cópia.'),
        h('p', null, 'É uma ferramenta de organização pessoal e não substitui um profissional de saúde.'),
        btn('Entendi', () => store.update((s) => { s.meta.welcomed = true; }), 'btn-block'),
      ),
    );
  }

  const next = nextAction(state, t);
  nodes.push(
    h(
      'section',
      { class: next.id === 'ok' ? 'card' : 'card highlight' },
      h('h2', null, next.title),
      h('p', { class: 'muted' }, next.detail),
      next.cta ? primaryBtn(next.cta, () => (next.action === 'checkin' ? openCheckin(app) : app.navigate(next.route)), 'btn-lg btn-block') : null,
    ),
  );

  const brk = breakStatus(state.settings, state.breakState, t);
  nodes.push(
    h(
      'div',
      { class: 'grid2' },
      btn(`+ ${state.settings.water.defaultMl} ml de água`, () => addWater(app, state.settings.water.defaultMl), 'btn-lg'),
      btn('Fiz a pausa', () => markBreakDone(app), 'btn-lg'),
      btn('Check-in', () => openCheckin(app), 'btn-lg'),
      btn('Iniciar atividade', () => app.navigate('/mexer'), 'btn-lg'),
    ),
  );

  const water = waterTotal(state, today);
  const goal = state.settings.water.goalMl;
  const checkin = latestCheckin(state, today);
  const sleepMin = sleepTotal(state, today);
  const plan = plannedToday(state, t);
  const actMin = activityMinutes(state, today);
  const breaksDone = state.logs.breaks.filter((b) => b.date === today && b.status === 'done').length;
  const careToday = state.logs.mobility.filter((m) => m.date === today).length;

  nodes.push(
    card(
      'Resumo de hoje',
      h('div', { class: 'stack' }, h('div', { class: 'row' }, h('span', { class: 'big' }, `${water} ml`), h('span', { class: 'muted' }, `de ${goal} ml`)), meter(water, goal, 'Progresso de água de hoje')),
      h(
        'div',
        { class: 'list' },
        row('Água', water >= goal ? 'Meta de hoje atingida' : `Faltam ${Math.max(0, goal - water)} ml para a meta`, '/agua'),
        row('Sono', sleepMin == null ? 'Sem registro para hoje' : `${formatDuration(sleepMin)} (aproximado)`, '/sono'),
        row('Check-in', checkinSummary(checkin), '/', () => openCheckin(app)),
        row('Refeições', `${mealsDone(state, today)} de ${state.meals.length} marcadas`, '/comer'),
        row(
          'Movimento',
          actMin > 0 ? `${formatDuration(actMin)} hoje` : plan.length ? `Planejado: ${plan.map((p) => `${p.minutes} min`).join(', ')}` : 'Nada registrado hoje',
          '/mexer',
        ),
        row(
          'Pausas',
          `${breaksDone} feita${breaksDone === 1 ? '' : 's'}${brk.state === 'waiting' || brk.state === 'snoozed' ? ` · próxima ${atLabel(brk.dueAt)}` : ''}`,
          '/pausas',
        ),
        row('Mobilidade e mindfulness', careToday ? `${careToday} concluído${careToday === 1 ? '' : 's'} hoje` : 'Cartões rápidos de 1 a 3 min', '/mobilidade'),
      ),
    ),
  );

  const focusLists = state.playlists.filter((p) => p.kind === 'focus');
  nodes.push(
    card(
      'Música e foco',
      focusLists.length
        ? h('div', { class: 'stack' }, focusLists.map((p) => h('a', { class: 'btn btn-lg', href: p.url, target: '_blank', rel: 'noopener noreferrer' }, `Abrir: ${p.label}`)))
        : h('p', { class: 'muted' }, `Nenhuma playlist de “${PLAYLIST_KINDS.focus}” salva ainda.`),
      h('a', { class: 'btn btn-quiet', href: '#/musica' }, 'Gerenciar playlists'),
    ),
  );

  nodes.push(h('p', { class: 'footer-note' }, 'Ferramenta de organização pessoal; não substitui profissional de saúde.'));
  return nodes;
}
