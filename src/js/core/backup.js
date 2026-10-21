// Normalização do estado (ao carregar e ao importar) e formato do arquivo de backup.
// Registros inválidos são descartados e contados, em vez de quebrar o app.

import { ACTIVITY_TYPES, PLAYLIST_KINDS, SCHEMA_VERSION, defaultState, uid } from './defaults.js';
import { sleepMinutes } from './metrics.js';
import { dateKey, isDateKey, parseTime } from './time.js';
import { int, isObj, num, safeUrl, text } from './validate.js';

export const APP_ID = 'meu-eixo';

const optNum = (v, min, max) => (v == null || v === '' ? null : num(v, min, max));
const optInt = (v, min, max) => (v == null || v === '' ? null : int(v, min, max));
const idOf = (r) => (typeof r.id === 'string' && r.id ? r.id.slice(0, 64) : uid());
const hasKey = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

// Cada limpador devolve o registro saneado ou null (descartado).
const cleaners = {
  checkins(r) {
    const mood = int(r.mood, 1, 5);
    const energy = int(r.energy, 1, 5);
    const stress = int(r.stress, 1, 5);
    const disposition = int(r.disposition, 1, 5);
    if (!isDateKey(r.date) || num(r.ts, 1) == null || [mood, energy, stress, disposition].includes(null)) return null;
    return { id: idOf(r), date: r.date, ts: r.ts, mood, energy, stress, disposition, note: text(r.note) };
  },
  sleep(r) {
    const latencyMin = optNum(r.latencyMin, 0, 600);
    const calc = sleepMinutes(r.bed, r.wake, latencyMin ?? 0);
    if (!isDateKey(r.date) || !calc) return null;
    return {
      id: idOf(r),
      date: r.date,
      bed: r.bed,
      wake: r.wake,
      latencyMin,
      awakenings: optInt(r.awakenings, 0, 50),
      quality: optInt(r.quality, 1, 5),
      note: text(r.note),
      inBedMin: calc.inBedMin,
      sleepMin: calc.sleepMin,
    };
  },
  water(r) {
    const ml = num(r.ml, 1, 10000);
    if (!isDateKey(r.date) || num(r.ts, 1) == null || ml == null) return null;
    return { id: idOf(r), date: r.date, ts: r.ts, ml };
  },
  mealLogs(r) {
    const mealName = text(r.mealName, 80);
    if (!isDateKey(r.date) || !mealName) return null;
    return { id: idOf(r), date: r.date, mealId: text(r.mealId, 64), mealName, done: r.done === true, foods: text(r.foods, 1000), note: text(r.note, 1000) };
  },
  activities(r) {
    const durationMin = num(r.durationMin, 1, 1440);
    if (!isDateKey(r.date) || num(r.ts, 1) == null || durationMin == null) return null;
    return {
      id: idOf(r),
      date: r.date,
      ts: r.ts,
      type: hasKey(ACTIVITY_TYPES, r.type) ? r.type : 'other',
      durationMin,
      distanceKm: optNum(r.distanceKm, 0, 1000),
      effort: optInt(r.effort, 1, 10),
      note: text(r.note, 1000),
    };
  },
  breaks(r) {
    if (!isDateKey(r.date) || num(r.ts, 1) == null || !['done', 'snoozed'].includes(r.status)) return null;
    return { id: idOf(r), date: r.date, ts: r.ts, status: r.status };
  },
  mobility(r) {
    const cardId = text(r.cardId, 64);
    if (!isDateKey(r.date) || num(r.ts, 1) == null || !cardId) return null;
    return { id: idOf(r), date: r.date, ts: r.ts, cardId, kind: r.kind === 'mindfulness' ? 'mindfulness' : 'mobility', title: text(r.title, 120) };
  },
  health(r) {
    let sys = optInt(r.sys, 50, 300);
    let dia = optInt(r.dia, 30, 200);
    const hr = optInt(r.hr, 20, 250);
    if ((sys == null) !== (dia == null)) {
      sys = null;
      dia = null;
    }
    if (!isDateKey(r.date) || num(r.ts, 1) == null || (sys == null && hr == null)) return null;
    return { id: idOf(r), date: r.date, ts: r.ts, sys, dia, hr, note: text(r.note, 1000) };
  },
  meals(r) {
    const name = text(r.name, 80);
    if (!name || parseTime(r.time) == null) return null;
    return { id: idOf(r), name, time: r.time };
  },
  plan(r) {
    const weekday = int(r.weekday, 0, 6);
    const minutes = int(r.minutes, 1, 600);
    if (weekday == null || minutes == null) return null;
    return { id: idOf(r), weekday, type: hasKey(ACTIVITY_TYPES, r.type) ? r.type : 'other', minutes };
  },
  playlists(r) {
    const label = text(r.label, 80);
    const url = safeUrl(r.url);
    if (!label || !url) return null;
    return { id: idOf(r), label, url, kind: hasKey(PLAYLIST_KINDS, r.kind) ? r.kind : 'focus' };
  },
};

const LOG_KEYS = ['checkins', 'sleep', 'water', 'mealLogs', 'activities', 'breaks', 'mobility', 'health'];

function cleanList(raw, cleaner) {
  const list = Array.isArray(raw) ? raw : [];
  const out = [];
  let dropped = 0;
  for (const r of list) {
    const c = isObj(r) ? cleaner(r) : null;
    if (c) out.push(c);
    else dropped++;
  }
  return { out, dropped };
}

function timeOr(v, fallback) {
  return parseTime(v) != null ? v : fallback;
}

function cleanSettings(raw, def) {
  const s = isObj(raw) ? raw : {};
  const w = isObj(s.water) ? s.water : {};
  const b = isObj(s.breaks) ? s.breaks : {};
  const wr = isObj(s.waterReminder) ? s.waterReminder : {};
  const bt = isObj(s.bedtime) ? s.bedtime : {};
  return {
    water: { goalMl: num(w.goalMl, 200, 10000) ?? def.water.goalMl, defaultMl: num(w.defaultMl, 50, 2000) ?? def.water.defaultMl },
    breaks: {
      enabled: typeof b.enabled === 'boolean' ? b.enabled : def.breaks.enabled,
      intervalMin: num(b.intervalMin, 5, 720) ?? def.breaks.intervalMin,
      start: timeOr(b.start, def.breaks.start),
      end: timeOr(b.end, def.breaks.end),
      snoozeMin: num(b.snoozeMin, 1, 120) ?? def.breaks.snoozeMin,
    },
    waterReminder: {
      enabled: typeof wr.enabled === 'boolean' ? wr.enabled : def.waterReminder.enabled,
      intervalMin: num(wr.intervalMin, 15, 720) ?? def.waterReminder.intervalMin,
      start: timeOr(wr.start, def.waterReminder.start),
      end: timeOr(wr.end, def.waterReminder.end),
    },
    bedtime: {
      enabled: typeof bt.enabled === 'boolean' ? bt.enabled : def.bedtime.enabled,
      time: timeOr(bt.time, def.bedtime.time),
      leadMin: num(bt.leadMin, 5, 240) ?? def.bedtime.leadMin,
    },
    notifications: typeof s.notifications === 'boolean' ? s.notifications : def.notifications,
    keepScreenOn: typeof s.keepScreenOn === 'boolean' ? s.keepScreenOn : def.keepScreenOn,
  };
}

/** Garante um estado completo e válido a partir de qualquer objeto. Retorna { state, dropped }. */
export function normalizeState(raw) {
  const def = defaultState();
  const src = isObj(raw) ? raw : {};
  const logsIn = isObj(src.logs) ? src.logs : {};
  let dropped = 0;

  const logs = {};
  for (const key of LOG_KEYS) {
    const { out, dropped: d } = cleanList(logsIn[key], cleaners[key]);
    logs[key] = out;
    dropped += d;
  }

  const lists = {};
  for (const key of ['meals', 'plan', 'playlists']) {
    if (Array.isArray(src[key])) {
      const { out, dropped: d } = cleanList(src[key], cleaners[key]);
      lists[key] = out;
      dropped += d;
    } else {
      lists[key] = def[key];
    }
  }

  const t = src.timer;
  const timer =
    isObj(t) && hasKey(ACTIVITY_TYPES, t.type) && num(t.accMs, 0) != null && (t.startedAt === null || num(t.startedAt, 1) != null)
      ? { type: t.type, startedAt: t.startedAt, accMs: t.accMs }
      : null;

  const bs = isObj(src.breakState) ? src.breakState : {};
  const bts = isObj(src.bedtimeState) ? src.bedtimeState : {};
  const meta = isObj(src.meta) ? src.meta : {};

  const state = {
    schema: SCHEMA_VERSION,
    settings: cleanSettings(src.settings, def.settings),
    meals: lists.meals,
    plan: lists.plan,
    playlists: lists.playlists,
    logs,
    timer,
    breakState: { lastDoneAt: num(bs.lastDoneAt, 1), snoozedUntil: num(bs.snoozedUntil, 1) },
    bedtimeState: { dismissedDate: isDateKey(bts.dismissedDate) ? bts.dismissedDate : null },
    meta: { welcomed: meta.welcomed === true, lastExportAt: num(meta.lastExportAt, 1) },
  };
  return { state, dropped };
}

export function countRecords(state) {
  const counts = {};
  let total = 0;
  for (const key of LOG_KEYS) {
    counts[key] = state.logs[key].length;
    total += counts[key];
  }
  counts.total = total;
  return counts;
}

export function buildBackup(state, now = Date.now()) {
  return { app: APP_ID, schema: SCHEMA_VERSION, exportedAt: new Date(now).toISOString(), data: state };
}

export function backupFilename(now = Date.now()) {
  return `meu-eixo-backup-${dateKey(new Date(now))}.json`;
}

/** Lê o texto de um arquivo de backup. Nunca lança: retorna { ok:false, error } se algo estiver errado. */
export function parseBackup(textContent) {
  let json;
  try {
    json = JSON.parse(textContent);
  } catch {
    return { ok: false, error: 'O arquivo não é um JSON válido.' };
  }
  if (!isObj(json) || json.app !== APP_ID || !isObj(json.data)) {
    return { ok: false, error: 'Este arquivo não parece ser um backup do Meu Eixo.' };
  }
  if (typeof json.schema === 'number' && json.schema > SCHEMA_VERSION) {
    return { ok: false, error: 'Este backup foi gerado por uma versão mais nova do app. Atualize o app antes de importar.' };
  }
  const { state, dropped } = normalizeState(json.data);
  return { ok: true, state, dropped, counts: countRecords(state), exportedAt: typeof json.exportedAt === 'string' ? json.exportedAt : null };
}
