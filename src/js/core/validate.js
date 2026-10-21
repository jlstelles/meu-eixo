// Pequenos validadores compartilhados entre formulários e importação de backup.

export const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Número finito dentro do intervalo, ou null. */
export function num(v, min = -Infinity, max = Infinity) {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null;
}

/** Inteiro dentro do intervalo, ou null. */
export function int(v, min = -Infinity, max = Infinity) {
  return Number.isInteger(v) && v >= min && v <= max ? v : null;
}

export function text(v, max = 500) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

/** Só aceita links http(s); bloqueia javascript:, data:, etc. Retorna a URL normalizada ou null. */
export function safeUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const u = new URL(value.trim());
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}
