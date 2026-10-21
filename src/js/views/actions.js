// Ações usadas por mais de uma tela.

import { SCALES, uid } from '../core/defaults.js';
import { dateKey } from '../core/time.js';
import { openForm } from '../ui/sheet.js';

const todayOf = (app) => dateKey(new Date(app.now()));

export function addWater(app, ml) {
  const rec = { id: uid(), date: todayOf(app), ts: app.now(), ml };
  app.store.update((s) => s.logs.water.push(rec));
  app.toast(`+${ml} ml registrados.`, { action: { label: 'Desfazer', onClick: () => removeSilently(app, 'water', rec.id) } });
}

function removeSilently(app, key, id) {
  app.store.update((s) => {
    s.logs[key] = s.logs[key].filter((r) => r.id !== id);
  });
}

/** Apaga um registro e oferece "Desfazer" (mais leve que pedir confirmação a cada toque). */
export function removeRecord(app, key, id, label = 'Registro') {
  const list = app.store.get().logs[key];
  const idx = list.findIndex((r) => r.id === id);
  if (idx < 0) return;
  const rec = list[idx];
  app.store.update((s) => s.logs[key].splice(idx, 1));
  app.toast(`${label} apagado.`, {
    action: {
      label: 'Desfazer',
      onClick: () => app.store.update((s) => s.logs[key].splice(Math.min(idx, s.logs[key].length), 0, rec)),
    },
  });
}

export function markBreakDone(app) {
  const ts = app.now();
  app.store.update((s) => {
    s.breakState = { lastDoneAt: ts, snoozedUntil: null };
    s.logs.breaks.push({ id: uid(), date: todayOf(app), ts, status: 'done' });
  });
  app.toast('Pausa registrada. Bom trabalho!');
}

export function snoozeBreak(app) {
  const ts = app.now();
  const mins = app.store.get().settings.breaks.snoozeMin;
  app.store.update((s) => {
    s.breakState.snoozedUntil = ts + mins * 60000;
    s.logs.breaks.push({ id: uid(), date: todayOf(app), ts, status: 'snoozed' });
  });
  app.toast(`Pausa adiada por ${mins} min.`);
}

export function openCheckin(app, record = null) {
  const fields = Object.entries(SCALES).map(([name, sc]) => ({ name, type: 'scale', label: sc.label, low: sc.low, high: sc.high, required: true }));
  fields.push({ name: 'note', type: 'textarea', label: 'Observação (opcional)', maxlength: 500 });
  openForm({
    title: record ? 'Editar check-in' : 'Como você está agora?',
    intro: 'Escolha de 1 a 5 em cada item. É só um registro para você, não uma avaliação.',
    fields,
    values: record ?? {},
    onSubmit(v) {
      app.store.update((s) => {
        if (record) {
          const r = s.logs.checkins.find((x) => x.id === record.id);
          if (r) Object.assign(r, { mood: v.mood, energy: v.energy, stress: v.stress, disposition: v.disposition, note: v.note });
        } else {
          s.logs.checkins.push({ id: uid(), date: todayOf(app), ts: app.now(), mood: v.mood, energy: v.energy, stress: v.stress, disposition: v.disposition, note: v.note });
        }
      });
      app.toast('Check-in salvo.');
    },
  });
}

/** Remove um item de uma lista de configuração (plano, playlists) com "Desfazer". */
export function removeListItem(app, key, id, label = 'Item') {
  const list = app.store.get()[key];
  const idx = list.findIndex((r) => r.id === id);
  if (idx < 0) return;
  const item = list[idx];
  app.store.update((s) => s[key].splice(idx, 1));
  app.toast(`${label} removido.`, {
    action: { label: 'Desfazer', onClick: () => app.store.update((s) => s[key].splice(Math.min(idx, s[key].length), 0, item)) },
  });
}
