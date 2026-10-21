import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defaultState } from '../src/js/core/defaults.js';
import { nextAction, pendingMeal, plannedToday } from '../src/js/core/next-action.js';
import { bedtimeStatus, breakStatus, dueReminders, waterReminderStatus } from '../src/js/core/reminders.js';
import { elapsedMs, isRunning, minutesForLog, pauseTimer, resumeTimer, startTimer } from '../src/js/core/timer.js';

// 20/10/2026 é uma terça-feira (getDay() === 2).
const at = (h, m = 0) => new Date(2026, 9, 20, h, m).getTime();
const TODAY = '2026-10-20';

test('cronômetro: pausa e retomada somam corretamente', () => {
  let t = startTimer('walk', 1000);
  assert.equal(isRunning(t), true);
  assert.equal(elapsedMs(t, 61_000), 60_000);
  t = pauseTimer(t, 61_000);
  assert.equal(isRunning(t), false);
  assert.equal(elapsedMs(t, 999_999), 60_000, 'pausado não avança');
  t = resumeTimer(t, 100_000);
  assert.equal(elapsedMs(t, 130_000), 90_000);
  assert.equal(elapsedMs(null, 5), 0);
  assert.equal(elapsedMs({ type: 'walk', startedAt: 5000, accMs: 0 }, 1000), 0, 'relógio voltando não gera tempo negativo');
});

test('cronômetro: minutos para registro arredondam e têm mínimo de 1', () => {
  assert.equal(minutesForLog(10_000), 1);
  assert.equal(minutesForLog(29 * 60_000 + 40_000), 30);
  assert.equal(minutesForLog(0), 1);
});

test('pausa: antes, durante e depois do expediente', () => {
  const s = defaultState(); // 09:00–18:00, a cada 90 min
  assert.equal(breakStatus(s.settings, s.breakState, at(8, 0)).state, 'waiting');
  assert.equal(breakStatus(s.settings, s.breakState, at(10, 29)).state, 'waiting');
  const due = breakStatus(s.settings, s.breakState, at(10, 30));
  assert.equal(due.state, 'due');
  assert.equal(due.dueAt, at(10, 30));
  assert.equal(breakStatus(s.settings, s.breakState, at(18, 1)).state, 'outside');
  s.settings.breaks.enabled = false;
  assert.equal(breakStatus(s.settings, s.breakState, at(10, 30)).state, 'off');
});

test('pausa: "Fiz a pausa" reinicia a contagem e "Adiar" empurra o horário', () => {
  const s = defaultState();
  s.breakState.lastDoneAt = at(10, 40);
  assert.equal(breakStatus(s.settings, s.breakState, at(12, 0)).state, 'waiting');
  assert.equal(breakStatus(s.settings, s.breakState, at(12, 10)).dueAt, at(12, 10));
  assert.equal(breakStatus(s.settings, s.breakState, at(12, 10)).state, 'due');
});

test('pausa: adiamento a partir do horário devido', () => {
  const s = defaultState();
  const dueAt = at(10, 30);
  s.breakState = { lastDoneAt: null, snoozedUntil: dueAt + 10 * 60000 };
  assert.equal(breakStatus(s.settings, s.breakState, at(10, 35)).state, 'snoozed');
  assert.equal(breakStatus(s.settings, s.breakState, at(10, 40)).state, 'due');
});

test('pausa de ontem não conta hoje', () => {
  const s = defaultState();
  s.breakState.lastDoneAt = new Date(2026, 9, 19, 17, 30).getTime();
  assert.equal(breakStatus(s.settings, s.breakState, at(9, 30)).state, 'waiting');
  assert.equal(breakStatus(s.settings, s.breakState, at(10, 30)).state, 'due');
});

test('lembrete de água usa o último registro como base', () => {
  const s = defaultState();
  s.settings.waterReminder.enabled = true; // 08:00–21:00, a cada 120 min
  assert.equal(waterReminderStatus(s.settings, null, at(9, 59)).state, 'waiting');
  assert.equal(waterReminderStatus(s.settings, null, at(10, 0)).state, 'due');
  assert.equal(waterReminderStatus(s.settings, at(9, 30), at(10, 0)).state, 'waiting');
  assert.equal(waterReminderStatus(s.settings, at(9, 30), at(11, 30)).state, 'due');
  assert.equal(waterReminderStatus(s.settings, null, at(21, 30)).state, 'outside');
  s.settings.waterReminder.enabled = false;
  assert.equal(waterReminderStatus(s.settings, null, at(12, 0)).state, 'off');
});

test('preparação para dormir', () => {
  const s = defaultState();
  s.settings.bedtime.enabled = true; // 22:30, 30 min antes
  assert.equal(bedtimeStatus(s.settings, s.bedtimeState, at(21, 59)).state, 'waiting');
  assert.equal(bedtimeStatus(s.settings, s.bedtimeState, at(22, 0)).state, 'due');
  assert.equal(bedtimeStatus(s.settings, s.bedtimeState, at(23, 59)).state, 'due');
  s.bedtimeState.dismissedDate = TODAY;
  assert.equal(bedtimeStatus(s.settings, s.bedtimeState, at(22, 10)).state, 'done');
});

test('dueReminders lista só o que está no horário, com chave por ocorrência', () => {
  const s = defaultState();
  assert.deepEqual(dueReminders(s, at(9, 0)), []);
  const r = dueReminders(s, at(10, 31));
  assert.equal(r.length, 1);
  assert.equal(r[0].id, 'break');
  assert.equal(r[0].key, `break:${at(10, 30)}`);
  s.settings.breaks.enabled = false;
  assert.deepEqual(dueReminders(s, at(10, 31)), []);
});

test('próxima ação: ordem de prioridade e dia em dia', () => {
  const s = defaultState();
  s.settings.breaks.enabled = false;

  assert.equal(nextAction(s, at(15, 0)).id, 'checkin');

  s.logs.checkins.push({ id: 'c', date: TODAY, ts: at(8), mood: 3, energy: 3, stress: 3, disposition: 3 });
  assert.equal(nextAction(s, at(9, 0)).id, 'sleep', 'de manhã sem sono registrado');
  assert.equal(nextAction(s, at(15, 0)).id, 'ok', 'à tarde não cobra sono');

  s.logs.sleep.push({ id: 's', date: TODAY, bed: '23:00', wake: '06:30', latencyMin: null, awakenings: null, quality: 3, note: '', inBedMin: 450, sleepMin: 450 });
  assert.equal(nextAction(s, at(10, 0)).id, 'ok', 'sono registrado: sem cobrança');
  assert.equal(nextAction(s, at(12, 40)).id, 'meal', 'perto do almoço');
  s.logs.mealLogs.push({ id: 'm', date: TODAY, mealId: 'almoco', mealName: 'Almoço', done: true, foods: '', note: '' });
  assert.equal(nextAction(s, at(12, 40)).id, 'ok');

  s.plan.push({ id: 'p', weekday: 2, type: 'walk', minutes: 30 });
  assert.equal(nextAction(s, at(15, 0)).id, 'plan');
  s.logs.activities.push({ id: 'a', date: TODAY, ts: at(14), type: 'walk', durationMin: 25, distanceKm: null, effort: null, note: '' });
  assert.equal(nextAction(s, at(15, 0)).id, 'ok', 'atividade feita não é cobrada de novo');

  s.settings.breaks.enabled = true;
  assert.equal(nextAction(s, at(11, 0)).id, 'break');

  s.timer = startTimer('run', at(11, 0));
  assert.equal(nextAction(s, at(11, 5)).id, 'timer', 'cronômetro rodando tem prioridade máxima');
});

test('plano de hoje e refeição pendente', () => {
  const s = defaultState();
  s.plan.push({ id: 'a', weekday: 2, type: 'walk', minutes: 30 }, { id: 'b', weekday: 3, type: 'run', minutes: 20 });
  assert.deepEqual(plannedToday(s, at(10)).map((p) => p.id), ['a']);
  assert.equal(pendingMeal(s, at(7, 40)).id, 'cafe');
  assert.equal(pendingMeal(s, at(10, 30)), null, 'café já passou há mais de 2 h');
  assert.equal(pendingMeal(s, at(3, 0)), null);
});
