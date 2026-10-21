// Constantes e estado inicial. Nenhum dado pessoal fictício: só modelos editáveis (refeições, pausas).

export const SCHEMA_VERSION = 1;

export const ACTIVITY_TYPES = {
  walk: 'Caminhada',
  run: 'Corrida',
  mobility: 'Mobilidade',
  other: 'Outra',
};

export const PLAYLIST_KINDS = {
  focus: 'Foco no trabalho',
  walk: 'Caminhada',
  run: 'Corrida',
  mobility: 'Mobilidade',
  mindfulness: 'Mindfulness',
  sleep: 'Preparar para dormir',
};

/** Playlist sugerida para cada tipo de atividade. */
export const PLAYLIST_FOR_ACTIVITY = { walk: 'walk', run: 'run', mobility: 'mobility', other: 'focus' };

export function defaultState() {
  return {
    schema: SCHEMA_VERSION,
    settings: {
      water: { goalMl: 2000, defaultMl: 250 },
      breaks: { enabled: true, intervalMin: 90, start: '09:00', end: '18:00', snoozeMin: 10 },
      waterReminder: { enabled: false, intervalMin: 120, start: '08:00', end: '21:00' },
      bedtime: { enabled: false, time: '22:30', leadMin: 30 },
      notifications: false,
      keepScreenOn: true,
    },
    meals: [
      { id: 'cafe', name: 'Café da manhã', time: '07:30' },
      { id: 'almoco', name: 'Almoço', time: '12:30' },
      { id: 'lanche', name: 'Lanche da tarde', time: '16:00' },
      { id: 'jantar', name: 'Jantar', time: '19:30' },
    ],
    plan: [],
    playlists: [],
    logs: {
      checkins: [],
      sleep: [],
      water: [],
      mealLogs: [],
      activities: [],
      breaks: [],
      mobility: [],
      health: [],
    },
    timer: null,
    breakState: { lastDoneAt: null, snoozedUntil: null },
    bedtimeState: { dismissedDate: null },
    meta: { welcomed: false, lastExportAt: null },
  };
}

export const SCALES = {
  mood: { label: 'Humor', low: 'Muito baixo', high: 'Muito bom' },
  energy: { label: 'Energia', low: 'Muito baixa', high: 'Muito alta' },
  stress: { label: 'Estresse', low: 'Calmo', high: 'Muito alto' },
  disposition: { label: 'Disposição', low: 'Sem disposição', high: 'Muita disposição' },
};

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
