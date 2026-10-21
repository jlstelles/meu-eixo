// Cronômetro baseado em timestamps: continua correto se a tela bloquear, o app for fechado ou recarregado.
// timer = { type, startedAt: ms | null (null = pausado), accMs: tempo acumulado antes da última retomada }

export const startTimer = (type, now) => ({ type, startedAt: now, accMs: 0 });

export const isRunning = (t) => Boolean(t) && t.startedAt != null;

export function elapsedMs(t, now) {
  if (!t) return 0;
  return t.accMs + (t.startedAt != null ? Math.max(0, now - t.startedAt) : 0);
}

export function pauseTimer(t, now) {
  if (!isRunning(t)) return t;
  return { ...t, startedAt: null, accMs: elapsedMs(t, now) };
}

export function resumeTimer(t, now) {
  if (!t || isRunning(t)) return t;
  return { ...t, startedAt: now };
}

/** Minutos inteiros (arredondados, mínimo 1) para pré-preencher o registro. */
export function minutesForLog(ms) {
  return Math.max(1, Math.round(ms / 60000));
}
