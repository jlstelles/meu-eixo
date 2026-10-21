// Hidratação: registro rápido, meta ajustável, histórico do dia e da semana.

import { weekSummary, waterTotal } from '../core/metrics.js';
import { atTime, clockOf, dateKey, parseDateKey, weekdayShort } from '../core/time.js';
import { h } from '../ui/dom.js';
import { openForm } from '../ui/sheet.js';
import { barChart, btn, card, emptyState, fmtNum, meter, primaryBtn, recordItem } from '../ui/widgets.js';
import { addWater, removeRecord } from './actions.js';

const liters = (ml) => fmtNum(ml / 1000, 1);

function openCustomAmount(app) {
  openForm({
    title: 'Outro volume',
    fields: [{ name: 'ml', type: 'number', label: 'Volume em ml', required: true, min: 1, max: 10000, step: 1, placeholder: 'Ex.: 500' }],
    submitLabel: 'Registrar',
    onSubmit: (v) => {
      if (!Number.isFinite(v.ml) || v.ml < 1) return 'Informe um volume válido.';
      addWater(app, Math.round(v.ml));
    },
  });
}

export function openGoal(app) {
  const w = app.store.get().settings.water;
  openForm({
    title: 'Meta e volume padrão',
    fields: [
      { name: 'goalMl', type: 'number', label: 'Meta diária (ml)', required: true, min: 200, max: 10000, step: 50, hint: 'Escolha uma meta que faça sentido para você. Em caso de dúvida, converse com um profissional de saúde.' },
      { name: 'defaultMl', type: 'number', label: 'Volume do botão rápido (ml)', required: true, min: 50, max: 2000, step: 10 },
    ],
    values: w,
    onSubmit: (v) => {
      if (v.goalMl < 200 || v.goalMl > 10000 || v.defaultMl < 50 || v.defaultMl > 2000) return 'Valores fora do intervalo permitido.';
      app.store.update((s) => {
        s.settings.water.goalMl = Math.round(v.goalMl);
        s.settings.water.defaultMl = Math.round(v.defaultMl);
      });
    },
  });
}

function openEdit(app, rec) {
  openForm({
    title: 'Editar registro de água',
    fields: [
      { name: 'ml', type: 'number', label: 'Volume (ml)', required: true, min: 1, max: 10000, step: 1 },
      { name: 'time', type: 'time', label: 'Horário', required: true },
    ],
    values: { ml: rec.ml, time: clockOf(rec.ts) },
    onSubmit: (v) => {
      const ts = atTime(rec.date, v.time);
      if (!Number.isFinite(ts) || v.ml < 1) return 'Confira o volume e o horário.';
      app.store.update((s) => {
        const r = s.logs.water.find((x) => x.id === rec.id);
        if (r) Object.assign(r, { ml: Math.round(v.ml), ts });
      });
    },
    onDelete: () => {
      removeRecord(app, 'water', rec.id, 'Registro de água');
      return true;
    },
  });
}

export function renderWater(app) {
  const state = app.store.get();
  const today = dateKey(new Date(app.now()));
  const { goalMl, defaultMl } = state.settings.water;
  const total = waterTotal(state, today);
  const entries = state.logs.water.filter((r) => r.date === today).sort((a, b) => b.ts - a.ts);
  const week = weekSummary(state, today);

  return [
    card(
      'Hoje',
      h('div', { class: 'row' }, h('span', { class: 'big' }, `${total} ml`), h('span', { class: 'muted' }, `de ${goalMl} ml`)),
      meter(total, goalMl, 'Progresso de água de hoje'),
      h('p', { class: 'muted' }, total >= goalMl ? 'Meta de hoje atingida.' : `Faltam ${goalMl - total} ml para a meta.`),
      primaryBtn(`+ ${defaultMl} ml`, () => addWater(app, defaultMl), 'btn-lg btn-block'),
      h('div', { class: 'grid2' }, btn('Outro volume', () => openCustomAmount(app)), btn('Meta e volume padrão', () => openGoal(app))),
    ),
    card(
      'Registros de hoje',
      entries.length
        ? h('div', { class: 'list' }, entries.map((r) => recordItem({ title: `${r.ml} ml`, meta: `às ${clockOf(r.ts)}`, onEdit: () => openEdit(app, r), onDelete: () => removeRecord(app, 'water', r.id, 'Registro de água') })))
        : emptyState('Nenhuma água registrada hoje ainda.'),
    ),
    card(
      'Últimos 7 dias',
      barChart(
        week.water.map((d) => ({ label: weekdayShort(parseDateKey(d.date).getDay()), value: d.ml > 0 ? d.ml : null, text: d.ml > 0 ? liters(d.ml) : '—' })),
        goalMl,
        'Água por dia, em litros, nos últimos 7 dias',
      ),
      h('p', { class: 'muted' }, week.avgWaterMl == null ? 'Sem registros nos últimos 7 dias.' : `Média nos dias com registro: ${liters(week.avgWaterMl)} L · meta atingida em ${week.waterGoalDays} de 7 dias.`),
    ),
  ];
}
