// Datas e horas sempre no fuso local do aparelho. "Dia" é uma chave 'AAAA-MM-DD'.

export const pad = (n) => String(n).padStart(2, '0');

export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isDateKey(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return dateKey(parseDateKey(s)) === s;
}

export function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key, n) {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

/** Últimos n dias terminando em endKey, do mais antigo ao mais novo. */
export function lastDays(endKey, n = 7) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(addDays(endKey, -i));
  return out;
}

/** 'HH:MM' -> minutos desde 00:00, ou null se inválido. */
export function parseTime(str) {
  if (typeof str !== 'string') return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(str.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function formatTime(minutes) {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

/** Timestamp (ms) de 'HH:MM' no dia indicado, no fuso local. */
export function atTime(day, hhmm) {
  const mins = parseTime(hhmm);
  if (mins == null) return NaN;
  const d = parseDateKey(day);
  d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
  return d.getTime();
}

/** 'HH:MM' local de um timestamp. */
export function clockOf(ts) {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function minutesOfDay(ts) {
  const d = new Date(ts);
  return d.getHours() * 60 + d.getMinutes();
}

/** 450 -> '7 h 30 min'; 45 -> '45 min'; null -> '—'. */
export function formatDuration(minutes) {
  if (minutes == null || !Number.isFinite(minutes)) return '—';
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${pad(m)} min`;
}

/** Milissegundos -> 'MM:SS' ou 'H:MM:SS' (cronômetro). */
export function formatClock(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Valor de <input type="datetime-local"> a partir de um timestamp. */
export function toLocalInput(ts) {
  const d = new Date(ts);
  return `${dateKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(str) {
  if (typeof str !== 'string' || !str) return NaN;
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(str);
  if (!m || !isDateKey(m[1])) return NaN;
  return atTime(m[1], m[2]);
}

const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
export const weekdayName = (i) => WEEKDAYS[i] ?? '';
export const weekdayShort = (i) => (WEEKDAYS[i] ?? '').slice(0, 3);

/** 'terça-feira, 20 de outubro' (sem depender de Intl para o dia da semana). */
export function formatDateLong(key) {
  const d = parseDateKey(key);
  const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  return `${weekdayName(d.getDay())}, ${d.getDate()} de ${months[d.getMonth()]}`;
}

/** '20/10' para rótulos curtos. */
export function formatDayMonth(key) {
  const [, m, d] = key.split('-');
  return `${d}/${m}`;
}
