// Cálculo de lembretes (puro). Quem dispara avisos é o app aberto (ver app.js):
// este módulo só diz o que está no horário. Nada aqui roda em segundo plano.

import { lastWaterTs } from './metrics.js';
import { atTime, clockOf, dateKey } from './time.js';

const MIN = 60000;

function dayWindow(now, start, end) {
  const day = dateKey(new Date(now));
  return { day, start: atTime(day, start), end: atTime(day, end) };
}

/**
 * Estado da pausa de trabalho.
 * state: 'off' | 'outside' (fora do expediente ou sem mais pausas hoje) | 'waiting' | 'snoozed' | 'due'
 */
export function breakStatus(settings, breakState, now) {
  const s = settings.breaks;
  if (!s.enabled) return { state: 'off', dueAt: null };
  const { start, end } = dayWindow(now, s.start, s.end);
  if (!(end > start)) return { state: 'off', dueAt: null };
  if (now > end) return { state: 'outside', dueAt: null };
  const base = Math.max(start, breakState.lastDoneAt ?? 0);
  const natural = base + s.intervalMin * MIN;
  const snoozed = breakState.snoozedUntil != null && breakState.snoozedUntil > breakState.lastDoneAt;
  const dueAt = snoozed ? Math.max(natural, breakState.snoozedUntil) : natural;
  if (dueAt > end) return { state: 'outside', dueAt: null };
  if (now >= dueAt) return { state: 'due', dueAt };
  return { state: snoozed ? 'snoozed' : 'waiting', dueAt };
}

export function waterReminderStatus(settings, lastWater, now) {
  const s = settings.waterReminder;
  if (!s.enabled) return { state: 'off', dueAt: null };
  const { start, end } = dayWindow(now, s.start, s.end);
  if (!(end > start)) return { state: 'off', dueAt: null };
  if (now > end) return { state: 'outside', dueAt: null };
  const base = Math.max(start, lastWater ?? 0);
  const dueAt = base + s.intervalMin * MIN;
  if (dueAt > end) return { state: 'outside', dueAt: null };
  return { state: now >= dueAt ? 'due' : 'waiting', dueAt };
}

/** Preparação para dormir: começa `leadMin` antes do horário e dura até 2 h depois dele. */
export function bedtimeStatus(settings, bedtimeState, now) {
  const s = settings.bedtime;
  if (!s.enabled) return { state: 'off', dueAt: null };
  const day = dateKey(new Date(now));
  const target = atTime(day, s.time);
  const prepAt = target - s.leadMin * MIN;
  if (bedtimeState.dismissedDate === day) return { state: 'done', dueAt: prepAt };
  if (now < prepAt) return { state: 'waiting', dueAt: prepAt };
  if (now <= target + 120 * MIN) return { state: 'due', dueAt: prepAt };
  return { state: 'outside', dueAt: null };
}

/** Lembretes que estão no horário agora. Cada item tem uma chave estável por ocorrência. */
export function dueReminders(state, now) {
  const out = [];
  const b = breakStatus(state.settings, state.breakState, now);
  if (b.state === 'due') {
    out.push({ id: 'break', key: `break:${b.dueAt}`, dueAt: b.dueAt, title: 'Hora de uma pausa', body: 'Levante, alongue e respire um pouco.', route: '/pausas' });
  }
  const w = waterReminderStatus(state.settings, lastWaterTs(state, dateKey(new Date(now))), now);
  if (w.state === 'due') {
    out.push({ id: 'water', key: `water:${w.dueAt}`, dueAt: w.dueAt, title: 'Que tal um copo de água?', body: 'Registre quando beber.', route: '/agua' });
  }
  const bed = bedtimeStatus(state.settings, state.bedtimeState, now);
  if (bed.state === 'due') {
    out.push({ id: 'bed', key: `bed:${bed.dueAt}`, dueAt: bed.dueAt, title: 'Hora de se preparar para dormir', body: 'Reduza luzes e telas aos poucos.', route: '/pausas' });
  }
  return out;
}

/** Texto curto "às HH:MM" para a interface. */
export const atLabel = (ts) => (ts == null ? '—' : `às ${clockOf(ts)}`);
