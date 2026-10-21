import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defaultState } from '../src/js/core/defaults.js';
import { sleepMinutes, sleepTotal, waterTotal, weekSummary } from '../src/js/core/metrics.js';
import {
  addDays, atTime, clockOf, dateKey, formatClock, formatDuration, formatTime, fromLocalInput, isDateKey, lastDays, parseTime, toLocalInput,
} from '../src/js/core/time.js';

test('dateKey e addDays atravessam mês e ano', () => {
  assert.equal(dateKey(new Date(2026, 9, 20, 23, 59)), '2026-10-20');
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.deepEqual(lastDays('2026-03-02', 3), ['2026-02-28', '2026-03-01', '2026-03-02']);
});

test('isDateKey rejeita datas inexistentes e formatos errados', () => {
  assert.equal(isDateKey('2026-10-20'), true);
  assert.equal(isDateKey('2026-02-30'), false);
  assert.equal(isDateKey('20/10/2026'), false);
  assert.equal(isDateKey(null), false);
});

test('parseTime / formatTime / atTime', () => {
  assert.equal(parseTime('07:30'), 450);
  assert.equal(parseTime('7:05'), 425);
  assert.equal(parseTime('24:00'), null);
  assert.equal(parseTime('12:60'), null);
  assert.equal(parseTime('abc'), null);
  assert.equal(parseTime(undefined), null);
  assert.equal(formatTime(450), '07:30');
  assert.equal(formatTime(-30), '23:30');
  const ts = atTime('2026-10-20', '08:15');
  assert.equal(clockOf(ts), '08:15');
  assert.equal(dateKey(new Date(ts)), '2026-10-20');
  assert.ok(Number.isNaN(atTime('2026-10-20', 'xx')));
});

test('formatDuration e formatClock', () => {
  assert.equal(formatDuration(450), '7 h 30 min');
  assert.equal(formatDuration(45), '45 min');
  assert.equal(formatDuration(120), '2 h');
  assert.equal(formatDuration(null), '—');
  assert.equal(formatClock(65_000), '01:05');
  assert.equal(formatClock(3_725_000), '1:02:05');
  assert.equal(formatClock(-5), '00:00');
});

test('datetime-local faz ida e volta', () => {
  const ts = new Date(2026, 9, 20, 14, 5).getTime();
  assert.equal(toLocalInput(ts), '2026-10-20T14:05');
  assert.equal(fromLocalInput('2026-10-20T14:05'), ts);
  assert.ok(Number.isNaN(fromLocalInput('')));
  assert.ok(Number.isNaN(fromLocalInput('2026-13-40T10:00')));
});

test('sleepMinutes cruza a meia-noite e desconta latência', () => {
  assert.deepEqual(sleepMinutes('23:00', '06:30'), { inBedMin: 450, sleepMin: 450 });
  assert.deepEqual(sleepMinutes('23:00', '06:30', 20), { inBedMin: 450, sleepMin: 430 });
  assert.deepEqual(sleepMinutes('00:30', '07:00'), { inBedMin: 390, sleepMin: 390 });
  assert.deepEqual(sleepMinutes('14:00', '15:00'), { inBedMin: 60, sleepMin: 60 });
  assert.equal(sleepMinutes('22:00', '22:00'), null);
  assert.equal(sleepMinutes('xx', '06:00'), null);
  assert.equal(sleepMinutes('22:00', '06:00', 9999).sleepMin, 0);
});

function stateWith(logs) {
  const s = defaultState();
  Object.assign(s.logs, logs);
  return s;
}

test('totais do dia: água soma, sono ausente é null', () => {
  const s = stateWith({
    water: [
      { id: 'a', date: '2026-10-20', ts: 1, ml: 250 },
      { id: 'b', date: '2026-10-20', ts: 2, ml: 500 },
      { id: 'c', date: '2026-10-19', ts: 3, ml: 300 },
    ],
    sleep: [{ id: 's', date: '2026-10-20', bed: '23:00', wake: '06:30', sleepMin: 450, inBedMin: 450, quality: 4 }],
  });
  assert.equal(waterTotal(s, '2026-10-20'), 750);
  assert.equal(waterTotal(s, '2026-10-18'), 0);
  assert.equal(sleepTotal(s, '2026-10-20'), 450);
  assert.equal(sleepTotal(s, '2026-10-19'), null);
});

test('resumo semanal ignora dias sem dado nas médias', () => {
  const s = stateWith({
    water: [
      { id: 'a', date: '2026-10-20', ts: 1, ml: 2000 },
      { id: 'b', date: '2026-10-18', ts: 2, ml: 1000 },
    ],
    sleep: [
      { id: 's1', date: '2026-10-20', sleepMin: 420, inBedMin: 420, quality: 4 },
      { id: 's2', date: '2026-10-19', sleepMin: 360, inBedMin: 360, quality: 2 },
    ],
    activities: [
      { id: 'x', date: '2026-10-20', ts: 1, type: 'walk', durationMin: 30, distanceKm: 2.5, effort: 4 },
      { id: 'y', date: '2026-10-18', ts: 1, type: 'run', durationMin: 20, distanceKm: null, effort: null },
      { id: 'z', date: '2026-09-01', ts: 1, type: 'walk', durationMin: 99, distanceKm: 9, effort: null },
    ],
    checkins: [{ id: 'c', date: '2026-10-20', ts: 1, mood: 4, energy: 3, stress: 2, disposition: 5 }],
  });
  const w = weekSummary(s, '2026-10-20');
  assert.equal(w.days.length, 7);
  assert.equal(w.avgWaterMl, 1500);
  assert.equal(w.waterGoalDays, 1);
  assert.equal(w.avgSleepMin, 390);
  assert.equal(w.avgSleepQuality, 3);
  assert.equal(w.activityTotalMin, 50);
  assert.equal(w.activitySessions, 2);
  assert.equal(w.activeDays, 2);
  assert.equal(w.distanceKm, 2.5);
  assert.equal(w.checkinAvg.mood, 4);

  const empty = weekSummary(defaultState(), '2026-10-20');
  assert.equal(empty.avgWaterMl, null);
  assert.equal(empty.avgSleepMin, null);
  assert.equal(empty.checkinAvg.mood, null);
  assert.equal(empty.activityTotalMin, 0);
});
