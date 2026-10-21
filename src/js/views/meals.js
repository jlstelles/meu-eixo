// Alimentação: refeições e horários personalizáveis, registro por dia, sem contar calorias.

import { uid } from '../core/defaults.js';
import { addDays, dateKey, formatDateLong, parseTime } from '../core/time.js';
import { h } from '../ui/dom.js';
import { confirmSheet, openForm } from '../ui/sheet.js';
import { btn, card, cardWithAction, emptyState, primaryBtn, recordItem } from '../ui/widgets.js';
import { removeRecord } from './actions.js';

const findLog = (state, date, mealId) => state.logs.mealLogs.find((r) => r.date === date && r.mealId === mealId);

function toggleDone(app, meal, date) {
  app.store.update((s) => {
    const existing = findLog(s, date, meal.id);
    if (existing) existing.done = !existing.done;
    else s.logs.mealLogs.push({ id: uid(), date, mealId: meal.id, mealName: meal.name, done: true, foods: '', note: '' });
  });
}

function openMealLog(app, meal, date, existing) {
  openForm({
    title: meal.name,
    intro: formatDateLong(date),
    fields: [
      { name: 'done', type: 'checkbox', label: 'Já comi' },
      { name: 'foods', type: 'textarea', label: 'O que comeu (opcional)', maxlength: 1000 },
      { name: 'note', type: 'textarea', label: 'Observações (opcional)', hint: 'Fome, horário diferente, como se sentiu… o que fizer sentido para você.', maxlength: 1000 },
    ],
    values: existing ?? { done: true },
    onSubmit: (v) => {
      app.store.update((s) => {
        const cur = findLog(s, date, meal.id);
        if (cur) Object.assign(cur, { done: v.done, foods: v.foods, note: v.note, mealName: meal.name });
        else s.logs.mealLogs.push({ id: uid(), date, mealId: meal.id, mealName: meal.name, done: v.done, foods: v.foods, note: v.note });
      });
    },
  });
}

function openTemplate(app, meal = null) {
  openForm({
    title: meal ? 'Editar refeição' : 'Nova refeição',
    fields: [
      { name: 'name', type: 'text', label: 'Nome', required: true, maxlength: 80, placeholder: 'Ex.: Lanche da manhã' },
      { name: 'time', type: 'time', label: 'Horário', required: true },
    ],
    values: meal ?? { time: '' },
    onSubmit: (v) => {
      if (!v.name) return 'Informe um nome.';
      if (parseTime(v.time) == null) return 'Informe um horário válido.';
      app.store.update((s) => {
        if (meal) {
          const m = s.meals.find((x) => x.id === meal.id);
          if (m) Object.assign(m, { name: v.name, time: v.time });
        } else {
          s.meals.push({ id: uid(), name: v.name, time: v.time });
        }
      });
    },
  });
}

async function deleteTemplate(app, meal) {
  const ok = await confirmSheet({
    title: `Remover “${meal.name}”?`,
    message: 'Os registros que você já fez dessa refeição continuam no histórico.',
    confirmLabel: 'Remover refeição',
    danger: true,
  });
  if (ok) app.store.update((s) => { s.meals = s.meals.filter((m) => m.id !== meal.id); });
}

export function renderMeals(app) {
  const state = app.store.get();
  const today = dateKey(new Date(app.now()));
  const date = app.ui.mealDate && app.ui.mealDate <= today ? app.ui.mealDate : today;
  const go = (d) => {
    app.ui.mealDate = d;
    app.refresh();
  };
  const meals = [...state.meals].sort((a, b) => parseTime(a.time) - parseTime(b.time));
  const orphan = state.logs.mealLogs.filter((r) => r.date === date && !state.meals.some((m) => m.id === r.mealId));

  const nav = h(
    'div',
    { class: 'row' },
    btn('‹', () => go(addDays(date, -1)), '', { 'aria-label': 'Dia anterior' }),
    h('div', { class: 'grow', style: 'text-align:center' }, h('strong', null, date === today ? 'Hoje' : formatDateLong(date))),
    btn('›', () => go(addDays(date, 1)), '', { 'aria-label': 'Próximo dia', disabled: date >= today }),
  );

  const mealRows = meals.map((meal) => {
    const log = findLog(state, date, meal.id);
    const done = Boolean(log?.done);
    return h(
      'div',
      { class: 'meal' },
      h('div', null, h('div', { class: 'title' }, `${meal.time} · ${meal.name}`), h('div', { class: 'muted' }, done ? `Feita${log.foods ? `: ${log.foods}` : ''}` : 'Pendente'), log?.note ? h('div', { class: 'hint' }, log.note) : null),
      h('div', { class: 'grid2' }, done ? btn('Desmarcar', () => toggleDone(app, meal, date)) : primaryBtn('Marcar como feita', () => toggleDone(app, meal, date)), btn('Detalhes', () => openMealLog(app, meal, date, log))),
    );
  });

  return [
    card(
      'Refeições do dia',
      nav,
      meals.length ? h('div', { class: 'list' }, mealRows) : emptyState('Nenhuma refeição configurada. Adicione abaixo.'),
      ...(orphan.length
        ? [h('p', { class: 'muted' }, 'Registros de refeições removidas:'), h('div', { class: 'list' }, orphan.map((r) => recordItem({ title: r.mealName, meta: `${r.done ? 'Feita' : 'Pendente'}${r.foods ? `: ${r.foods}` : ''}`, onDelete: () => removeRecord(app, 'mealLogs', r.id, 'Registro') })))]
        : []),
    ),
    cardWithAction(
      'Refeições e horários',
      btn('Adicionar', () => openTemplate(app), 'btn-sm'),
      meals.length
        ? h('div', { class: 'list' }, meals.map((m) => recordItem({ title: m.name, meta: m.time, onEdit: () => openTemplate(app, m), onDelete: () => deleteTemplate(app, m) })))
        : emptyState('Sem refeições.'),
      h('p', { class: 'hint' }, 'Sem contagem de calorias: marque o que fez sentido comer e anote se quiser.'),
    ),
  ];
}
