// Pausas e lembretes: fluxo da pausa, rotina noturna, configuração de lembretes e avisos do sistema.

import { ACTIVITY_TYPES, SCALES } from '../core/defaults.js';
import { lastWaterTs, latestCheckin } from '../core/metrics.js';
import { plannedToday } from '../core/next-action.js';
import { atLabel, bedtimeStatus, breakStatus, waterReminderStatus } from '../core/reminders.js';
import { startTimer } from '../core/timer.js';
import { clockOf, dateKey, formatDayMonth, parseTime } from '../core/time.js';
import { h } from '../ui/dom.js';
import { notificationSupport, requestNotificationPermission, showSystemNotification } from '../ui/notify.js';
import { openForm } from '../ui/sheet.js';
import { btn, card, primaryBtn } from '../ui/widgets.js';
import { markBreakDone, openCheckin, snoozeBreak } from './actions.js';

const onOff = (b) => (b ? 'ativado' : 'desativado');

function breakText(status) {
  switch (status.state) {
    case 'off': return 'Lembretes de pausa desativados.';
    case 'outside': return 'Sem mais pausas programadas por hoje.';
    case 'waiting': return `Próxima pausa ${atLabel(status.dueAt)}.`;
    case 'snoozed': return `Pausa adiada até ${clockOf(status.dueAt)}.`;
    default: return 'Que tal uma pausa agora?';
  }
}

function openBreakSettings(app) {
  const b = app.store.get().settings.breaks;
  openForm({
    title: 'Pausas no trabalho',
    fields: [
      { name: 'enabled', type: 'checkbox', label: 'Lembrar de pausas' },
      { name: 'intervalMin', type: 'number', label: 'A cada quantos minutos', required: true, min: 5, max: 720, step: 5 },
      { name: 'start', type: 'time', label: 'Início do expediente', required: true },
      { name: 'end', type: 'time', label: 'Fim do expediente', required: true },
      { name: 'snoozeMin', type: 'number', label: 'Adiar por (min)', required: true, min: 1, max: 120, step: 1 },
    ],
    values: b,
    onSubmit: (v) => {
      if (parseTime(v.end) <= parseTime(v.start)) return 'O fim precisa ser depois do início.';
      app.store.update((s) => {
        s.settings.breaks = { enabled: v.enabled, intervalMin: Math.round(v.intervalMin), start: v.start, end: v.end, snoozeMin: Math.round(v.snoozeMin) };
      });
    },
  });
}

function openWaterReminder(app) {
  openForm({
    title: 'Lembrete de água',
    fields: [
      { name: 'enabled', type: 'checkbox', label: 'Lembrar de beber água' },
      { name: 'intervalMin', type: 'number', label: 'A cada quantos minutos (depois do último registro)', required: true, min: 15, max: 720, step: 5 },
      { name: 'start', type: 'time', label: 'Começar às', required: true },
      { name: 'end', type: 'time', label: 'Parar às', required: true },
    ],
    values: app.store.get().settings.waterReminder,
    onSubmit: (v) => {
      if (parseTime(v.end) <= parseTime(v.start)) return 'O horário final precisa ser depois do inicial.';
      app.store.update((s) => {
        s.settings.waterReminder = { enabled: v.enabled, intervalMin: Math.round(v.intervalMin), start: v.start, end: v.end };
      });
    },
  });
}

function openBedtime(app) {
  openForm({
    title: 'Rotina noturna',
    intro: 'Escolha um horário entre 18:00 e 23:59.',
    fields: [
      { name: 'enabled', type: 'checkbox', label: 'Lembrar de me preparar para dormir' },
      { name: 'time', type: 'time', label: 'Horário de deitar', required: true },
      { name: 'leadMin', type: 'number', label: 'Avisar quantos minutos antes', required: true, min: 5, max: 240, step: 5 },
    ],
    values: app.store.get().settings.bedtime,
    onSubmit: (v) => {
      const m = parseTime(v.time);
      if (m == null || m < 18 * 60) return 'Use um horário entre 18:00 e 23:59.';
      app.store.update((s) => {
        s.settings.bedtime = { enabled: v.enabled, time: v.time, leadMin: Math.round(v.leadMin) };
      });
    },
  });
}

async function enableNotifications(app) {
  const permission = await requestNotificationPermission();
  app.store.update((s) => { s.settings.notifications = permission === 'granted'; });
  app.toast(permission === 'granted' ? 'Avisos do sistema permitidos.' : 'Sem permissão: os avisos aparecem só dentro do app.');
}

function playlistsFor(state, kinds) {
  return state.playlists.filter((p) => kinds.includes(p.kind)).map((p) => h('a', { class: 'btn', href: p.url, target: '_blank', rel: 'noopener noreferrer' }, `Abrir: ${p.label}`));
}

function startActivity(app, type) {
  app.store.update((s) => { s.timer = startTimer(type, app.now()); });
  app.navigate('/mexer');
}

export function renderBreaks(app) {
  const state = app.store.get();
  const t = app.now();
  const today = dateKey(new Date(t));
  const brk = breakStatus(state.settings, state.breakState, t);
  const water = waterReminderStatus(state.settings, lastWaterTs(state, today), t);
  const bed = bedtimeStatus(state.settings, state.bedtimeState, t);
  const planned = plannedToday(state, t);
  const checkin = latestCheckin(state, today);
  const lastHealth = [...state.logs.health].sort((a, b) => b.ts - a.ts)[0];
  const notif = notificationSupport();
  const timerRunning = state.timer != null;
  const musicLinks = playlistsFor(state, ['focus', 'walk', 'run', 'mobility']);

  return [
    h(
      'section',
      { class: brk.state === 'due' ? 'card highlight' : 'card' },
      h('h2', null, 'Pausa do trabalho'),
      h('p', null, breakText(brk)),
      primaryBtn('Fiz a pausa', () => markBreakDone(app), 'btn-lg btn-block'),
      btn(`Adiar ${state.settings.breaks.snoozeMin} min`, () => snoozeBreak(app), 'btn-block'),
    ),
    card(
      'Roteiro da pausa',
      h('p', { class: 'muted' }, 'Siga só o que fizer sentido hoje. Pular também vale.'),
      h(
        'div',
        { class: 'list' },
        h(
          'div',
          { class: 'meal' },
          h('div', { class: 'title' }, '1. Atividade planejada'),
          h('div', { class: 'muted' }, planned.length ? planned.map((p) => `${ACTIVITY_TYPES[p.type]} de ${p.minutes} min${p.done ? ' (já feita)' : ''}`).join(' · ') : 'Nada planejado para hoje.'),
        ),
        h(
          'div',
          { class: 'meal' },
          h('div', { class: 'title' }, '2. Como estou agora'),
          h('div', { class: 'muted' }, checkin ? Object.entries(SCALES).map(([k, sc]) => `${sc.label} ${checkin[k]}`).join(' · ') : 'Sem check-in hoje.'),
          btn('Fazer check-in', () => openCheckin(app)),
          h('p', { class: 'hint' }, 'Com dor, tontura ou mal-estar, prefira só alongar ou descansar. Sintoma forte, que piora ou que preocupa: procure atendimento (no Brasil, SAMU 192 em urgências).'),
        ),
        h(
          'div',
          { class: 'meal' },
          h('div', { class: 'title' }, '3. Último registro de pressão e batimentos'),
          h(
            'div',
            { class: 'muted' },
            lastHealth
              ? `${formatDayMonth(lastHealth.date)}: ${lastHealth.sys != null ? `${lastHealth.sys}/${lastHealth.dia} mmHg` : ''}${lastHealth.sys != null && lastHealth.hr != null ? ' · ' : ''}${lastHealth.hr != null ? `${lastHealth.hr} bpm` : ''}`
              : 'Nenhum registro (opcional).',
          ),
          h('p', { class: 'hint' }, 'Um valor isolado não indica se é seguro treinar. Em dúvida, converse com um profissional de saúde.'),
          h('a', { class: 'btn btn-sm', href: '#/saude' }, 'Registros de saúde'),
        ),
        h(
          'div',
          { class: 'meal' },
          h('div', { class: 'title' }, '4. Música'),
          musicLinks.length ? h('div', { class: 'stack' }, musicLinks) : h('div', { class: 'muted' }, 'Nenhuma playlist salva.'),
          h('a', { class: 'btn btn-sm', href: '#/musica' }, 'Gerenciar playlists'),
        ),
        h(
          'div',
          { class: 'meal' },
          h('div', { class: 'title' }, '5. Mexer um pouco'),
          timerRunning ? h('div', { class: 'muted' }, 'Já há um cronômetro em andamento.') : null,
          h(
            'div',
            { class: 'grid2' },
            h('a', { class: 'btn', href: '#/mobilidade' }, 'Alongar e respirar'),
            btn('Caminhada', () => (timerRunning ? app.navigate('/mexer') : startActivity(app, 'walk')), ''),
            btn('Corrida', () => (timerRunning ? app.navigate('/mexer') : startActivity(app, 'run')), ''),
            h('a', { class: 'btn', href: '#/mexer' }, 'Outras opções'),
          ),
        ),
      ),
    ),
    card(
      'Rotina noturna',
      h('p', { class: 'muted' }, bed.state === 'off' ? 'Lembrete desativado.' : `Preparação ${atLabel(bed.dueAt)}, antes de deitar às ${state.settings.bedtime.time}.`),
      h('ul', { class: 'plain' }, ['Baixar as luzes e deixar as telas de lado aos poucos', 'Deixar o ambiente confortável e silencioso', 'Alguns minutos de respiração lenta ou mindfulness'].map((x) => h('li', null, x))),
      ...playlistsFor(state, ['sleep']),
      h('div', { class: 'grid2' }, h('a', { class: 'btn', href: '#/mobilidade' }, 'Mindfulness'), btn('Já me preparei', () => app.store.update((s) => { s.bedtimeState.dismissedDate = today; }))),
    ),
    card(
      'Ajustar lembretes',
      h('div', { class: 'list' },
        settingRow('Pausas', `${onOff(state.settings.breaks.enabled)} · a cada ${state.settings.breaks.intervalMin} min, ${state.settings.breaks.start} às ${state.settings.breaks.end}`, () => openBreakSettings(app)),
        settingRow('Água', `${onOff(state.settings.waterReminder.enabled)} · a cada ${state.settings.waterReminder.intervalMin} min${water.state === 'waiting' || water.state === 'due' ? ` · próximo ${atLabel(water.dueAt)}` : ''}`, () => openWaterReminder(app)),
        settingRow('Rotina noturna', `${onOff(state.settings.bedtime.enabled)} · deitar ${state.settings.bedtime.time}, avisar ${state.settings.bedtime.leadMin} min antes`, () => openBedtime(app)),
      ),
    ),
    card(
      'Como os avisos funcionam',
      h('p', null, 'Os lembretes aparecem dentro do app enquanto ele está aberto. Com o app fechado, em segundo plano ou com a tela bloqueada, o Android pode não entregar nada: isso depende do navegador, das permissões e da economia de bateria.'),
      h('p', { class: 'muted' }, 'Por isso, não use o Meu Eixo como alarme confiável para algo importante.'),
      notif.supported
        ? h(
            'div',
            { class: 'stack' },
            h('p', { class: 'muted' }, `Avisos do sistema: ${notif.permission === 'granted' ? 'permitidos pelo navegador' : notif.permission === 'denied' ? 'bloqueados (libere nas configurações do site/navegador)' : 'ainda não permitidos'}${state.settings.notifications ? ' · ligados no app' : ''}.`),
            notif.permission === 'granted' && state.settings.notifications
              ? btn('Enviar aviso de teste', async () => app.toast((await showSystemNotification({ title: 'Meu Eixo', body: 'Aviso de teste.', tag: 'teste' })) ? 'Aviso de teste enviado.' : 'Não foi possível exibir o aviso neste navegador.'))
              : btn('Permitir avisos do sistema', () => enableNotifications(app)),
            state.settings.notifications ? btn('Desligar avisos do sistema', () => app.store.update((s) => { s.settings.notifications = false; })) : null,
          )
        : h('p', { class: 'muted' }, 'Este navegador não oferece avisos do sistema; os lembretes aparecem só dentro do app.'),
    ),
  ];
}

const settingRow = (title, meta, onClick) =>
  h('div', { class: 'item' }, h('div', { class: 'grow' }, h('div', { class: 'title' }, title), h('div', { class: 'muted' }, meta)), btn('Ajustar', onClick, 'btn-sm', { 'aria-label': `Ajustar ${title}` }));
