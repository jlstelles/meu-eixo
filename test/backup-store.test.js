import assert from 'node:assert/strict';
import { test } from 'node:test';
import { backupFilename, buildBackup, countRecords, normalizeState, parseBackup } from '../src/js/core/backup.js';
import { SCHEMA_VERSION, defaultState } from '../src/js/core/defaults.js';
import { CORRUPT_KEY, STORAGE_KEY, createStore, memoryStorage } from '../src/js/core/store.js';
import { safeUrl } from '../src/js/core/validate.js';

const sampleState = () => {
  const s = defaultState();
  s.logs.water.push({ id: 'w1', date: '2026-10-20', ts: 1760000000000, ml: 250 });
  s.logs.sleep.push({ id: 's1', date: '2026-10-20', bed: '23:00', wake: '06:30', latencyMin: 15, awakenings: 1, quality: 4, note: '', inBedMin: 450, sleepMin: 435 });
  s.logs.health.push({ id: 'h1', date: '2026-10-20', ts: 1760000000000, sys: 120, dia: 80, hr: 70, note: 'repouso' });
  s.playlists.push({ id: 'p1', label: 'Foco', url: 'https://example.com/lista', kind: 'focus' });
  s.plan.push({ id: 'pl1', weekday: 2, type: 'walk', minutes: 30 });
  return s;
};

test('normalizeState: lixo vira estado padrão válido', () => {
  for (const junk of [null, undefined, 42, 'x', [], { logs: 'oops', settings: 7, meals: 'não' }]) {
    const { state } = normalizeState(junk);
    assert.equal(state.schema, SCHEMA_VERSION);
    assert.deepEqual(Object.keys(state.logs), Object.keys(defaultState().logs));
    assert.equal(state.settings.water.goalMl, 2000);
    assert.ok(Array.isArray(state.meals));
  }
});

test('normalizeState: descarta registros inválidos e conta', () => {
  const raw = defaultState();
  raw.logs.water = [
    { id: 'ok', date: '2026-10-20', ts: 5, ml: 300 },
    { id: 'neg', date: '2026-10-20', ts: 5, ml: -10 },
    { id: 'data', date: '2026-02-31', ts: 5, ml: 200 },
    'texto',
    null,
  ];
  raw.logs.checkins = [{ id: 'c', date: '2026-10-20', ts: 5, mood: 9, energy: 3, stress: 3, disposition: 3 }];
  raw.logs.health = [
    { id: 'h1', date: '2026-10-20', ts: 5, sys: 120, dia: null, hr: null },
    { id: 'h2', date: '2026-10-20', ts: 5, sys: 120, dia: null, hr: 70 },
  ];
  const { state, dropped } = normalizeState(raw);
  assert.equal(state.logs.water.length, 1);
  assert.equal(state.logs.checkins.length, 0);
  assert.equal(state.logs.health.length, 1);
  assert.equal(state.logs.health[0].sys, null, 'pressão sem diastólica é descartada, FC é mantida');
  assert.equal(state.logs.health[0].hr, 70);
  assert.equal(dropped, 4 + 1 + 1);
});

test('normalizeState: recalcula duração do sono e protege configurações', () => {
  const raw = defaultState();
  raw.logs.sleep = [{ id: 's', date: '2026-10-20', bed: '23:00', wake: '07:00', latencyMin: 30, quality: 3, sleepMin: 99999 }];
  raw.settings.water.goalMl = -5;
  raw.settings.breaks.start = 'lixo';
  raw.settings.breaks.intervalMin = 'muito';
  const { state } = normalizeState(raw);
  assert.equal(state.logs.sleep[0].sleepMin, 450);
  assert.equal(state.logs.sleep[0].inBedMin, 480);
  assert.equal(state.settings.water.goalMl, 2000);
  assert.equal(state.settings.breaks.start, '09:00');
  assert.equal(state.settings.breaks.intervalMin, 90);
});

test('normalizeState: playlists só aceitam http(s)', () => {
  const raw = defaultState();
  raw.playlists = [
    { id: 'a', label: 'ok', url: 'https://example.com/x', kind: 'focus' },
    { id: 'b', label: 'xss', url: 'javascript:alert(1)', kind: 'focus' },
    { id: 'c', label: 'dados', url: 'data:text/html,<b>x</b>', kind: 'focus' },
  ];
  assert.deepEqual(normalizeState(raw).state.playlists.map((p) => p.id), ['a']);
  assert.equal(safeUrl('javascript:alert(1)'), null);
  assert.equal(safeUrl('not a url'), null);
  assert.equal(safeUrl(' https://open.spotify.com/playlist/abc '), 'https://open.spotify.com/playlist/abc');
});

test('cronômetro salvo é validado', () => {
  const ok = defaultState();
  ok.timer = { type: 'walk', startedAt: 1000, accMs: 500 };
  assert.deepEqual(normalizeState(ok).state.timer, { type: 'walk', startedAt: 1000, accMs: 500 });
  ok.timer = { type: 'voar', startedAt: 1000, accMs: 500 };
  assert.equal(normalizeState(ok).state.timer, null);
  ok.timer = { type: 'run', startedAt: null, accMs: -1 };
  assert.equal(normalizeState(ok).state.timer, null);
});

test('backup: exporta e importa sem perder nada', () => {
  const s = sampleState();
  const text = JSON.stringify(buildBackup(s, Date.UTC(2026, 9, 20, 15)));
  const res = parseBackup(text);
  assert.equal(res.ok, true);
  assert.deepEqual(res.state, s);
  assert.equal(res.dropped, 0);
  assert.equal(res.counts.total, countRecords(s).total);
  assert.equal(res.counts.water, 1);
  assert.match(backupFilename(new Date(2026, 9, 20, 12).getTime()), /^meu-eixo-backup-2026-10-20\.json$/);
});

test('backup: rejeita arquivos errados com mensagem clara', () => {
  assert.match(parseBackup('{{{').error, /JSON/);
  assert.match(parseBackup('{"foo":1}').error, /backup do Meu Eixo/);
  assert.match(parseBackup('[]').error, /backup do Meu Eixo/);
  assert.match(parseBackup(JSON.stringify({ app: 'meu-eixo', schema: 999, data: {} })).error, /mais nova/);
  assert.equal(parseBackup(JSON.stringify({ app: 'meu-eixo', schema: 1, data: {} })).ok, true);
});

test('store: salva, recarrega e notifica', () => {
  const storage = memoryStorage();
  const a = createStore(storage);
  let calls = 0;
  a.subscribe(() => calls++);
  a.update((s) => s.logs.water.push({ id: 'w', date: '2026-10-20', ts: 9, ml: 250 }));
  assert.equal(calls, 1);
  const b = createStore(storage);
  assert.equal(b.get().logs.water.length, 1);
  b.reset();
  assert.equal(createStore(storage).get().logs.water.length, 0);
});

test('store: dados corrompidos são preservados em outra chave', () => {
  const storage = memoryStorage();
  storage.setItem(STORAGE_KEY, '{quebrado');
  const store = createStore(storage);
  assert.equal(store.status().loadError, true);
  assert.equal(storage.getItem(CORRUPT_KEY), '{quebrado');
  assert.equal(store.get().logs.water.length, 0);
});

test('store: falha ao gravar é sinalizada, sem lançar erro', () => {
  const storage = memoryStorage();
  const store = createStore(storage);
  storage.setItem = () => {
    throw new Error('quota');
  };
  store.update((s) => s.logs.water.push({ id: 'w', date: '2026-10-20', ts: 9, ml: 1 }));
  assert.equal(store.status().saveError, true);
  assert.equal(store.get().logs.water.length, 1);
});
