// Sono: horários, duração aproximada, qualidade percebida, histórico semanal.

import { uid } from '../core/defaults.js';
import { sleepMinutes, weekSummary } from '../core/metrics.js';
import { dateKey, formatDayMonth, formatDuration, isDateKey, parseDateKey, weekdayShort } from '../core/time.js';
import { h } from '../ui/dom.js';
import { openForm } from '../ui/sheet.js';
import { barChart, card, emptyState, fmtNum, primaryBtn, recordItem } from '../ui/widgets.js';
import { removeRecord } from './actions.js';

const QUALITY = { 1: 'muito ruim', 2: 'ruim', 3: 'regular', 4: 'boa', 5: 'muito boa' };

const sorted = (list) => [...list].sort((a, b) => (a.date === b.date ? b.bed.localeCompare(a.bed) : b.date.localeCompare(a.date)));

function openSleepForm(app, rec = null) {
  const today = dateKey(new Date(app.now()));
  const last = sorted(app.store.get().logs.sleep)[0];
  const values = rec ?? { date: today, bed: last?.bed ?? '', wake: last?.wake ?? '' };
  openForm({
    title: rec ? 'Editar sono' : 'Registrar sono',
    fields: [
      { name: 'date', type: 'date', label: 'Dia em que acordou', required: true, max: today },
      { name: 'bed', type: 'time', label: 'Hora de deitar', required: true },
      { name: 'wake', type: 'time', label: 'Hora de acordar', required: true },
      { name: 'latencyMin', type: 'number', label: 'Demorou quantos min para dormir? (opcional)', min: 0, max: 600, step: 1 },
      { name: 'awakenings', type: 'number', label: 'Despertares durante a noite (opcional)', min: 0, max: 50, step: 1 },
      { name: 'quality', type: 'scale', label: 'Qualidade percebida (opcional)', low: 'Muito ruim', high: 'Muito boa' },
      { name: 'note', type: 'textarea', label: 'Observação (opcional)', maxlength: 500 },
    ],
    values,
    onSubmit: (v) => {
      if (!isDateKey(v.date)) return 'Informe o dia em que acordou.';
      const calc = sleepMinutes(v.bed, v.wake, v.latencyMin ?? 0);
      if (!calc) return 'Os horários de deitar e acordar não podem ser iguais nem inválidos.';
      const latencyMin = v.latencyMin == null ? null : Math.round(v.latencyMin);
      const awakenings = v.awakenings == null ? null : Math.round(v.awakenings);
      if ((latencyMin != null && (latencyMin < 0 || latencyMin > 600)) || (awakenings != null && (awakenings < 0 || awakenings > 50))) return 'Confira os valores opcionais.';
      const data = { date: v.date, bed: v.bed, wake: v.wake, latencyMin, awakenings, quality: v.quality, note: v.note, inBedMin: calc.inBedMin, sleepMin: calc.sleepMin };
      app.store.update((s) => {
        if (rec) {
          const r = s.logs.sleep.find((x) => x.id === rec.id);
          if (r) Object.assign(r, data);
        } else {
          s.logs.sleep.push({ id: uid(), ...data });
        }
      });
      app.toast('Sono salvo.');
    },
    onDelete: rec
      ? () => {
          removeRecord(app, 'sleep', rec.id, 'Registro de sono');
          return true;
        }
      : null,
  });
}

export function renderSleep(app) {
  const state = app.store.get();
  const today = dateKey(new Date(app.now()));
  const week = weekSummary(state, today);
  const list = sorted(state.logs.sleep);
  const latest = list[0];

  return [
    card(
      'Último registro',
      latest
        ? h(
            'div',
            { class: 'stack' },
            h('div', { class: 'row' }, h('span', { class: 'big' }, formatDuration(latest.sleepMin)), h('span', { class: 'muted' }, 'duração aproximada')),
            h('p', { class: 'muted' }, `${formatDayMonth(latest.date)}: deitou ${latest.bed}, acordou ${latest.wake}${latest.quality ? ` · qualidade ${QUALITY[latest.quality]}` : ''}`),
          )
        : emptyState('Nenhum sono registrado ainda.'),
      primaryBtn('Registrar sono', () => openSleepForm(app), 'btn-lg btn-block'),
    ),
    card(
      'Últimos 7 dias',
      barChart(
        week.sleep.map((d) => ({ label: weekdayShort(parseDateKey(d.date).getDay()), value: d.min, text: d.min == null ? '—' : fmtNum(d.min / 60, 1) })),
        8 * 60,
        'Horas de sono por dia nos últimos 7 dias; dias sem registro aparecem vazios',
      ),
      h(
        'p',
        { class: 'muted' },
        week.avgSleepMin == null
          ? 'Sem registros nos últimos 7 dias.'
          : `Média nos dias com registro: ${formatDuration(week.avgSleepMin)}${week.avgSleepQuality == null ? '' : ` · qualidade média ${fmtNum(week.avgSleepQuality, 1)} de 5`}.`,
      ),
      h('p', { class: 'hint' }, 'A duração é aproximada: tempo entre deitar e acordar, menos o tempo que você levou para dormir (se informado).'),
    ),
    card(
      'Histórico',
      list.length
        ? h(
            'div',
            { class: 'list' },
            list.slice(0, 30).map((r) =>
              recordItem({
                title: `${formatDayMonth(r.date)} · ${formatDuration(r.sleepMin)}`,
                meta: `${r.bed} → ${r.wake}${r.quality ? ` · ${QUALITY[r.quality]}` : ''}${r.awakenings ? ` · ${r.awakenings} despertar${r.awakenings === 1 ? '' : 'es'}` : ''}${r.note ? ` · ${r.note}` : ''}`,
                onEdit: () => openSleepForm(app, r),
                onDelete: () => removeRecord(app, 'sleep', r.id, 'Registro de sono'),
              }),
            ),
          )
        : emptyState('Seus registros aparecem aqui.'),
    ),
    h('a', { class: 'btn', href: '#/pausas' }, 'Lembrete para se preparar para dormir'),
  ];
}
