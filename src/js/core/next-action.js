// Escolhe UMA próxima ação para o painel "Hoje". Sem culpa: se nada está pendente, diz que está tudo em dia.

import { ACTIVITY_TYPES } from './defaults.js';
import { lastWaterTs, latestCheckin, sleepTotal } from './metrics.js';
import { bedtimeStatus, breakStatus, waterReminderStatus } from './reminders.js';
import { isRunning } from './timer.js';
import { dateKey, minutesOfDay, parseTime } from './time.js';

export function plannedToday(state, now) {
  const weekday = new Date(now).getDay();
  const today = dateKey(new Date(now));
  return state.plan
    .filter((p) => p.weekday === weekday)
    .map((p) => ({
      ...p,
      done: state.logs.activities.some((a) => a.date === today && a.type === p.type && a.durationMin > 0),
    }));
}

/** Refeição ainda não marcada perto do horário: de 30 min antes até 2 h depois (depois disso, sem cobrança). */
export function pendingMeal(state, now) {
  const today = dateKey(new Date(now));
  const nowMin = minutesOfDay(now);
  const done = new Set(state.logs.mealLogs.filter((r) => r.date === today && r.done).map((r) => r.mealId));
  return (
    [...state.meals]
      .sort((a, b) => parseTime(a.time) - parseTime(b.time))
      .find((m) => !done.has(m.id) && parseTime(m.time) <= nowMin + 30 && parseTime(m.time) > nowMin - 120) ?? null
  );
}

export function nextAction(state, now) {
  const today = dateKey(new Date(now));
  const hour = new Date(now).getHours();

  if (isRunning(state.timer)) {
    return { id: 'timer', title: 'Atividade em andamento', detail: `${ACTIVITY_TYPES[state.timer.type]}: cronômetro rodando.`, route: '/mexer', cta: 'Abrir cronômetro' };
  }
  if (breakStatus(state.settings, state.breakState, now).state === 'due') {
    return { id: 'break', title: 'Que tal uma pausa?', detail: 'Levante, alongue e respire. Se agora não dá, você pode adiar.', route: '/pausas', cta: 'Fazer pausa' };
  }
  if (bedtimeStatus(state.settings, state.bedtimeState, now).state === 'due') {
    return { id: 'bed', title: 'Hora de se preparar para dormir', detail: 'Baixe as luzes e deixe as telas de lado aos poucos.', route: '/pausas', cta: 'Ver rotina noturna' };
  }
  if (!latestCheckin(state, today)) {
    return { id: 'checkin', title: 'Como você está agora?', detail: 'Um check-in rápido leva menos de 20 segundos.', route: null, cta: 'Fazer check-in', action: 'checkin' };
  }
  if (hour < 14 && sleepTotal(state, today) == null) {
    return { id: 'sleep', title: 'Registrar como você dormiu', detail: 'Horários e qualidade percebida, só se quiser.', route: '/sono', cta: 'Registrar sono' };
  }
  if (waterReminderStatus(state.settings, lastWaterTs(state, today), now).state === 'due') {
    return { id: 'water', title: 'Que tal um copo de água?', detail: 'Toque para registrar quando beber.', route: '/agua', cta: 'Registrar água' };
  }
  const meal = pendingMeal(state, now);
  if (meal) {
    return { id: 'meal', title: `${meal.name} (${meal.time})`, detail: 'Marque quando comer e anote o que quiser.', route: '/comer', cta: 'Registrar refeição' };
  }
  const plan = plannedToday(state, now).find((p) => !p.done);
  if (plan) {
    return { id: 'plan', title: `Hoje: ${ACTIVITY_TYPES[plan.type].toLowerCase()} de ${plan.minutes} min`, detail: 'Do jeito que o corpo estiver. Ajuste ou pule sem culpa.', route: '/mexer', cta: 'Ver atividade' };
  }
  return { id: 'ok', title: 'Tudo em dia por agora', detail: 'Sem pressa. Volte quando quiser registrar algo.', route: null, cta: null };
}
