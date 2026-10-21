// Cálculos puros sobre o estado: durações, totais do dia e resumo semanal.
// Dados ausentes viram null (nunca zero inventado) para a interface mostrar "—".

import { lastDays, parseTime } from './time.js';

/** Duração entre deitar e acordar (cruza a meia-noite). Retorna null se inválido. */
export function sleepMinutes(bed, wake, latencyMin = 0) {
  const b = parseTime(bed);
  const w = parseTime(wake);
  if (b == null || w == null) return null;
  const inBedMin = (w - b + 1440) % 1440;
  if (inBedMin === 0) return null;
  const lat = Number.isFinite(latencyMin) && latencyMin > 0 ? latencyMin : 0;
  return { inBedMin, sleepMin: Math.max(0, inBedMin - lat) };
}

const onDate = (list, date) => list.filter((r) => r.date === date);
const sum = (arr) => arr.reduce((a, b) => a + b, 0);
const avg = (arr) => (arr.length ? sum(arr) / arr.length : null);

export function waterTotal(state, date) {
  return sum(onDate(state.logs.water, date).map((r) => r.ml));
}

/** Soma do sono registrado na data (data de acordar). null se não há registro. */
export function sleepTotal(state, date) {
  const recs = onDate(state.logs.sleep, date);
  return recs.length ? sum(recs.map((r) => r.sleepMin)) : null;
}

export function activityMinutes(state, date) {
  return sum(onDate(state.logs.activities, date).map((r) => r.durationMin));
}

export function latestCheckin(state, date) {
  const recs = onDate(state.logs.checkins, date);
  return recs.length ? recs.reduce((a, b) => (b.ts > a.ts ? b : a)) : null;
}

export function mealsDone(state, date) {
  return onDate(state.logs.mealLogs, date).filter((r) => r.done).length;
}

export function lastWaterTs(state, date) {
  const recs = onDate(state.logs.water, date);
  return recs.length ? Math.max(...recs.map((r) => r.ts)) : null;
}

export function weekSummary(state, endDate) {
  const days = lastDays(endDate, 7);
  const water = days.map((date) => ({ date, ml: waterTotal(state, date) }));
  const sleep = days.map((date) => ({ date, min: sleepTotal(state, date) }));
  const activity = days.map((date) => ({ date, min: activityMinutes(state, date) }));
  const acts = state.logs.activities.filter((r) => days.includes(r.date));
  const checks = state.logs.checkins.filter((r) => days.includes(r.date));
  const qualities = state.logs.sleep.filter((r) => days.includes(r.date) && r.quality != null).map((r) => r.quality);
  const waterDays = water.filter((d) => d.ml > 0).map((d) => d.ml);
  const sleepDays = sleep.filter((d) => d.min != null).map((d) => d.min);
  return {
    days,
    water,
    sleep,
    activity,
    avgWaterMl: avg(waterDays),
    waterGoalDays: water.filter((d) => d.ml >= state.settings.water.goalMl).length,
    avgSleepMin: avg(sleepDays),
    avgSleepQuality: avg(qualities),
    activityTotalMin: sum(activity.map((d) => d.min)),
    activitySessions: acts.length,
    activeDays: activity.filter((d) => d.min > 0).length,
    distanceKm: sum(acts.map((a) => a.distanceKm ?? 0)),
    checkinAvg: {
      mood: avg(checks.map((c) => c.mood)),
      energy: avg(checks.map((c) => c.energy)),
      stress: avg(checks.map((c) => c.stress)),
      disposition: avg(checks.map((c) => c.disposition)),
    },
    checkinCount: checks.length,
  };
}
