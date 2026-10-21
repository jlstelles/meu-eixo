// Movimento: plano simples, cronômetro persistente, registro manual, histórico e resumo semanal.

import { ACTIVITY_TYPES, PLAYLIST_FOR_ACTIVITY, uid } from '../core/defaults.js';
import { activityMinutes, weekSummary } from '../core/metrics.js';
import { plannedToday } from '../core/next-action.js';
import { elapsedMs, isRunning, minutesForLog, pauseTimer, resumeTimer, startTimer } from '../core/timer.js';
import { atTime, clockOf, dateKey, formatClock, formatDayMonth, formatDuration, isDateKey, parseDateKey, weekdayName, weekdayShort } from '../core/time.js';
import { h } from '../ui/dom.js';
import { confirmSheet, openForm } from '../ui/sheet.js';
import { keepAwake } from '../ui/wakelock.js';
import { barChart, btn, card, cardWithAction, emptyState, fmtNum, primaryBtn, recordItem } from '../ui/widgets.js';
import { removeListItem, removeRecord } from './actions.js';

const typeOptions = Object.entries(ACTIVITY_TYPES).map(([value, label]) => ({ value, label }));
const EFFORT_TEXT = { 1: 'muito leve', 3: 'leve', 5: 'moderado', 7: 'forte', 10: 'esforço máximo' };
const effortOptions = [{ value: '', label: 'Não informar' }, ...Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: EFFORT_TEXT[i + 1] ? `${i + 1} · ${EFFORT_TEXT[i + 1]}` : String(i + 1) }))];

function activityFields({ withDate }) {
  const fields = [];
  if (withDate) fields.push({ name: 'date', type: 'date', label: 'Dia', required: true });
  fields.push(
    { name: 'type', type: 'select', label: 'Tipo', options: typeOptions, required: true },
    { name: 'durationMin', type: 'number', label: 'Duração (min)', required: true, min: 1, max: 1440, step: 1 },
    { name: 'distanceKm', type: 'number', label: 'Distância em km (opcional)', min: 0, max: 1000, step: 0.01 },
    { name: 'effort', type: 'select', label: 'Esforço percebido (opcional)', options: effortOptions, hint: 'De 1 (muito leve) a 10 (máximo): como pareceu para você.' },
    { name: 'note', type: 'textarea', label: 'Observações (opcional)', hint: 'Como se sentiu, dor ou desconforto, percurso…', maxlength: 1000 },
  );
  return fields;
}

function cleanActivity(v) {
  const durationMin = Math.round(v.durationMin ?? 0);
  if (durationMin < 1 || durationMin > 1440) return { error: 'Informe uma duração entre 1 e 1440 minutos.' };
  if (v.distanceKm != null && (v.distanceKm < 0 || v.distanceKm > 1000)) return { error: 'Confira a distância.' };
  return { durationMin, type: v.type in ACTIVITY_TYPES ? v.type : 'other', distanceKm: v.distanceKm == null ? null : Math.round(v.distanceKm * 100) / 100, effort: v.effort ? Number(v.effort) : null, note: v.note };
}

function openManual(app) {
  const today = dateKey(new Date(app.now()));
  openForm({
    title: 'Registrar atividade',
    fields: activityFields({ withDate: true }).map((f) => (f.name === 'date' ? { ...f, max: today } : f)),
    values: { date: today, type: 'walk', durationMin: null },
    onSubmit: (v) => {
      if (!isDateKey(v.date)) return 'Informe o dia.';
      const c = cleanActivity(v);
      if (c.error) return c.error;
      const ts = v.date === today ? app.now() : atTime(v.date, '12:00');
      app.store.update((s) => s.logs.activities.push({ id: uid(), date: v.date, ts, ...c }));
      app.toast('Atividade registrada.');
    },
  });
}

function openEdit(app, rec) {
  openForm({
    title: 'Editar atividade',
    fields: activityFields({ withDate: true }).map((f) => (f.name === 'date' ? { ...f, max: dateKey(new Date(app.now())) } : f)),
    values: { ...rec, effort: rec.effort == null ? '' : String(rec.effort) },
    onSubmit: (v) => {
      if (!isDateKey(v.date)) return 'Informe o dia.';
      const c = cleanActivity(v);
      if (c.error) return c.error;
      app.store.update((s) => {
        const r = s.logs.activities.find((x) => x.id === rec.id);
        if (!r) return;
        const ts = v.date === rec.date ? r.ts : atTime(v.date, clockOf(r.ts));
        Object.assign(r, { date: v.date, ts, ...c });
      });
    },
    onDelete: () => {
      removeRecord(app, 'activities', rec.id, 'Atividade');
      return true;
    },
  });
}

function finishTimer(app) {
  const now = app.now();
  const state = app.store.get();
  if (!state.timer) return;
  const frozen = pauseTimer(state.timer, now);
  app.store.update((s) => {
    s.timer = frozen;
  });
  openForm({
    title: 'Finalizar atividade',
    intro: `Tempo no cronômetro: ${formatClock(elapsedMs(frozen, now))}. Ajuste a duração se precisar.`,
    fields: activityFields({ withDate: false }),
    values: { type: frozen.type, durationMin: minutesForLog(elapsedMs(frozen, now)), effort: '' },
    submitLabel: 'Salvar atividade',
    onSubmit: (v) => {
      const c = cleanActivity(v);
      if (c.error) return c.error;
      app.store.update((s) => {
        s.logs.activities.push({ id: uid(), date: dateKey(new Date(now)), ts: now, ...c });
        s.timer = null;
      });
      app.toast('Atividade salva. Bom trabalho!');
    },
  });
}

async function discardTimer(app) {
  const ok = await confirmSheet({ title: 'Descartar este cronômetro?', message: 'O tempo contado não será salvo.', confirmLabel: 'Descartar', danger: true });
  if (ok) app.store.update((s) => { s.timer = null; });
}

function playlistLinks(state, type) {
  const kind = PLAYLIST_FOR_ACTIVITY[type] ?? 'focus';
  return state.playlists.filter((p) => p.kind === kind).map((p) => h('a', { class: 'btn', href: p.url, target: '_blank', rel: 'noopener noreferrer' }, `Abrir playlist: ${p.label}`));
}

function timerCard(app, state) {
  const t = state.timer;
  if (!t) {
    return card(
      'Cronômetro',
      h('p', { class: 'muted' }, 'Escolha o tipo e comece quando estiver pronto. Você ajusta tudo ao finalizar.'),
      h('div', { class: 'grid2' }, Object.entries(ACTIVITY_TYPES).map(([type, label]) => btn(label, () => app.store.update((s) => { s.timer = startTimer(type, app.now()); }), 'btn-lg'))),
    );
  }
  const clock = h('div', { class: 'clock', role: 'timer', 'aria-label': 'Tempo decorrido' }, formatClock(elapsedMs(t, app.now())));
  if (isRunning(t)) {
    const id = setInterval(() => { clock.textContent = formatClock(elapsedMs(app.store.get().timer, app.now())); }, 1000);
    app.onCleanup(() => clearInterval(id));
    if (state.settings.keepScreenOn) {
      keepAwake(true);
      const reacquire = () => { if (document.visibilityState === 'visible') keepAwake(true); };
      document.addEventListener('visibilitychange', reacquire);
      app.onCleanup(() => {
        document.removeEventListener('visibilitychange', reacquire);
        keepAwake(false);
      });
    }
  }
  const links = playlistLinks(state, t.type);
  return h(
    'section',
    { class: 'card highlight' },
    h('div', { class: 'card-head' }, h('h2', null, `${ACTIVITY_TYPES[t.type]}${isRunning(t) ? '' : ' (pausado)'}`)),
    clock,
    h(
      'div',
      { class: 'grid2' },
      isRunning(t) ? btn('Pausar', () => app.store.update((s) => { s.timer = pauseTimer(s.timer, app.now()); }), 'btn-lg') : primaryBtn('Retomar', () => app.store.update((s) => { s.timer = resumeTimer(s.timer, app.now()); }), 'btn-lg'),
      primaryBtn('Finalizar', () => finishTimer(app), 'btn-lg'),
    ),
    links.length ? h('div', { class: 'stack' }, links) : null,
    btn('Descartar', () => discardTimer(app), 'btn-quiet'),
    h('p', { class: 'hint' }, 'Com a tela bloqueada o tempo continua sendo contado pelo horário de início, mas o app não toca alarme.'),
  );
}

function openPlanForm(app, item = null) {
  openForm({
    title: item ? 'Editar item do plano' : 'Novo item do plano',
    fields: [
      { name: 'weekday', type: 'select', label: 'Dia da semana', required: true, options: Array.from({ length: 7 }, (_, i) => ({ value: String(i), label: weekdayName(i) })) },
      { name: 'type', type: 'select', label: 'Atividade', required: true, options: typeOptions },
      { name: 'minutes', type: 'number', label: 'Duração planejada (min)', required: true, min: 1, max: 600, step: 1 },
    ],
    values: item ? { ...item, weekday: String(item.weekday) } : { weekday: String(new Date(app.now()).getDay()), type: 'walk', minutes: null },
    onSubmit: (v) => {
      const minutes = Math.round(v.minutes ?? 0);
      if (minutes < 1 || minutes > 600) return 'Informe uma duração entre 1 e 600 minutos.';
      const data = { weekday: Number(v.weekday), type: v.type in ACTIVITY_TYPES ? v.type : 'other', minutes };
      app.store.update((s) => {
        if (item) Object.assign(s.plan.find((p) => p.id === item.id) ?? {}, data);
        else s.plan.push({ id: uid(), ...data });
      });
    },
  });
}

export function renderMove(app) {
  const state = app.store.get();
  const t = app.now();
  const today = dateKey(new Date(t));
  const week = weekSummary(state, today);
  const todays = plannedToday(state, t);
  const history = [...state.logs.activities].sort((a, b) => b.ts - a.ts).slice(0, 30);
  const plan = [...state.plan].sort((a, b) => a.weekday - b.weekday || a.type.localeCompare(b.type));

  return [
    timerCard(app, state),
    card(
      'Plano de hoje',
      todays.length
        ? h('div', { class: 'list' }, todays.map((p) => h('div', { class: 'item' }, h('div', { class: 'grow' }, h('div', { class: 'title' }, `${ACTIVITY_TYPES[p.type]} · ${p.minutes} min`), h('div', { class: 'muted' }, p.done ? 'Já registrada hoje' : 'Do jeito que o corpo estiver: dá para ajustar ou pular')))))
        : emptyState(plan.length ? 'Nada planejado para hoje.' : 'Você ainda não montou um plano. É opcional.'),
      h('p', { class: 'hint' }, `Hoje: ${formatDuration(activityMinutes(state, today))} de movimento registrado.`),
      primaryBtn('Registrar atividade', () => openManual(app), 'btn-block'),
    ),
    card(
      'Resumo dos últimos 7 dias',
      h(
        'div',
        { class: 'grid2' },
        stat('Sessões', String(week.activitySessions)),
        stat('Tempo total', week.activityTotalMin ? formatDuration(week.activityTotalMin) : '—'),
        stat('Dias com movimento', `${week.activeDays} de 7`),
        stat('Distância', week.distanceKm > 0 ? `${fmtNum(week.distanceKm, 1)} km` : '—'),
      ),
      barChart(
        week.activity.map((d) => ({ label: weekdayShort(parseDateKey(d.date).getDay()), value: d.min > 0 ? d.min : null, text: d.min > 0 ? String(d.min) : '—' })),
        30,
        'Minutos de movimento por dia nos últimos 7 dias',
      ),
    ),
    card(
      'Histórico',
      history.length
        ? h(
            'div',
            { class: 'list' },
            history.map((r) =>
              recordItem({
                title: `${formatDayMonth(r.date)} · ${ACTIVITY_TYPES[r.type]} · ${r.durationMin} min`,
                meta: [r.distanceKm != null ? `${fmtNum(r.distanceKm, 2)} km` : null, r.effort != null ? `esforço ${r.effort}/10` : null, r.note || null].filter(Boolean).join(' · ') || null,
                onEdit: () => openEdit(app, r),
                onDelete: () => removeRecord(app, 'activities', r.id, 'Atividade'),
              }),
            ),
          )
        : emptyState('Suas atividades aparecem aqui.'),
    ),
    cardWithAction(
      'Plano semanal',
      btn('Adicionar', () => openPlanForm(app), 'btn-sm'),
      plan.length
        ? h('div', { class: 'list' }, plan.map((p) => recordItem({ title: `${weekdayName(p.weekday)} · ${ACTIVITY_TYPES[p.type]} · ${p.minutes} min`, onEdit: () => openPlanForm(app, p), onDelete: () => removeListItem(app, 'plan', p.id, 'Item do plano') })))
        : emptyState('Sem plano. Adicione só o que couber na sua semana.'),
      h('p', { class: 'hint' }, 'O plano é uma intenção sua, não uma recomendação do app. Adapte à sua condição e a orientações de profissionais.'),
    ),
  ];
}

const stat = (label, value) => h('div', null, h('div', { class: 'muted' }, label), h('div', { class: 'title' }, value));
