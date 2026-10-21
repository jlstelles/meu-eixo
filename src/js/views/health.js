// Saúde: registros opcionais de pressão arterial e frequência cardíaca, sem interpretação de valores.

import { uid } from '../core/defaults.js';
import { clockOf, dateKey, formatDayMonth, fromLocalInput, toLocalInput } from '../core/time.js';
import { h } from '../ui/dom.js';
import { openForm } from '../ui/sheet.js';
import { card, emptyState, primaryBtn, recordItem } from '../ui/widgets.js';
import { removeRecord } from './actions.js';

function describe(r) {
  const parts = [];
  if (r.sys != null) parts.push(`${r.sys}/${r.dia} mmHg`);
  if (r.hr != null) parts.push(`${r.hr} bpm`);
  return parts.join(' · ');
}

function openRecord(app, rec = null) {
  const now = app.now();
  openForm({
    title: rec ? 'Editar registro' : 'Novo registro',
    intro: 'Todos os campos de medida são opcionais, mas informe pelo menos pressão (os dois valores) ou frequência cardíaca.',
    fields: [
      { name: 'when', type: 'datetime-local', label: 'Data e hora', required: true, max: toLocalInput(now) },
      { name: 'sys', type: 'number', label: 'Pressão: máxima / sistólica (mmHg)', min: 50, max: 300, step: 1 },
      { name: 'dia', type: 'number', label: 'Pressão: mínima / diastólica (mmHg)', min: 30, max: 200, step: 1 },
      { name: 'hr', type: 'number', label: 'Frequência cardíaca (bpm)', min: 20, max: 250, step: 1 },
      { name: 'note', type: 'textarea', label: 'Notas (opcional)', hint: 'Ex.: em repouso, após caminhada, como se sentia.', maxlength: 1000 },
    ],
    values: rec ? { ...rec, when: toLocalInput(rec.ts) } : { when: toLocalInput(now) },
    onSubmit: (v) => {
      const ts = fromLocalInput(v.when);
      if (!Number.isFinite(ts)) return 'Informe a data e a hora.';
      const sys = v.sys == null ? null : Math.round(v.sys);
      const dia = v.dia == null ? null : Math.round(v.dia);
      const hr = v.hr == null ? null : Math.round(v.hr);
      if ((sys == null) !== (dia == null)) return 'Para a pressão, preencha os dois valores (máxima e mínima).';
      if (sys == null && hr == null) return 'Informe a pressão ou a frequência cardíaca.';
      if (sys != null && (sys < 50 || sys > 300 || dia < 30 || dia > 200)) return 'Confira os valores da pressão.';
      if (sys != null && sys <= dia) return 'Confira a pressão: o primeiro valor (máxima) costuma ser maior que o segundo.';
      if (hr != null && (hr < 20 || hr > 250)) return 'Confira a frequência cardíaca.';
      const data = { date: dateKey(new Date(ts)), ts, sys, dia, hr, note: v.note };
      app.store.update((s) => {
        if (rec) Object.assign(s.logs.health.find((x) => x.id === rec.id) ?? {}, data);
        else s.logs.health.push({ id: uid(), ...data });
      });
      app.toast('Registro salvo.');
    },
    onDelete: rec
      ? () => {
          removeRecord(app, 'health', rec.id, 'Registro de saúde');
          return true;
        }
      : null,
  });
}

export function renderHealth(app) {
  const list = [...app.store.get().logs.health].sort((a, b) => b.ts - a.ts);
  return [
    h(
      'section',
      { class: 'card note' },
      h('p', null, 'Estes registros são só um diário pessoal. O app não interpreta valores, não diagnostica nem diz se é seguro treinar. Leve seus registros a um profissional de saúde para avaliação.'),
      h('p', null, 'Dor no peito, falta de ar intensa, desmaio ou outro sintoma forte: interrompa o que estiver fazendo e procure atendimento (no Brasil, SAMU 192).'),
    ),
    card('Novo registro', primaryBtn('Registrar pressão ou batimentos', () => openRecord(app), 'btn-lg btn-block')),
    card(
      'Histórico',
      list.length
        ? h(
            'div',
            { class: 'list' },
            list.slice(0, 50).map((r) =>
              recordItem({ title: describe(r), meta: `${formatDayMonth(r.date)} às ${clockOf(r.ts)}${r.note ? ` · ${r.note}` : ''}`, onEdit: () => openRecord(app, r), onDelete: () => removeRecord(app, 'health', r.id, 'Registro de saúde') }),
            ),
          )
        : emptyState('Nenhum registro ainda. Este recurso é opcional.'),
    ),
  ];
}
