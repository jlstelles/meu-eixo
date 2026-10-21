// Peças visuais reutilizáveis pelas telas.

import { h } from './dom.js';

export const btn = (label, onClick, cls = '', attrs = {}) => h('button', { type: 'button', class: cls, on: { click: onClick }, ...attrs }, label);

export const primaryBtn = (label, onClick, cls = '') => btn(label, onClick, `btn-primary ${cls}`.trim());

export function card(title, ...children) {
  return h('section', { class: 'card' }, title ? h('div', { class: 'card-head' }, h('h2', null, title)) : null, ...children);
}

export function cardWithAction(title, actionEl, ...children) {
  return h('section', { class: 'card' }, h('div', { class: 'card-head' }, h('h2', null, title), actionEl), ...children);
}

export const emptyState = (text) => h('p', { class: 'empty-state' }, text);

/** Barra de progresso acessível. */
export function meter(value, max, label) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return h(
    'div',
    { class: 'meter', role: 'progressbar', 'aria-label': label, 'aria-valuemin': 0, 'aria-valuemax': max, 'aria-valuenow': Math.min(value, max) },
    h('span', { style: `width:${pct}%` }),
  );
}

/**
 * Gráfico de barras dos últimos dias. items: [{ label, value (number|null), text }]
 * Valor ausente (null) aparece como barra vazia, não como zero.
 */
export function barChart(items, max, description) {
  const top = Math.max(max, ...items.map((i) => i.value ?? 0), 1);
  return h(
    'div',
    { class: 'bars', role: 'group', 'aria-label': description },
    items.map((i) =>
      h(
        'div',
        { class: 'bar-col' },
        h('div', { class: 'bar-slot' }, h('div', { class: `bar${i.value == null || i.value === 0 ? ' empty' : ''}`, style: `height:${i.value ? Math.max(4, Math.round((i.value / top) * 100)) : 4}%` })),
        h('span', { class: 'bar-val' }, i.text),
        h('span', null, i.label),
      ),
    ),
  );
}

/** Linha de histórico com ações de editar e apagar. */
export function recordItem({ title, meta, onEdit, onDelete }) {
  return h(
    'div',
    { class: 'item' },
    h('div', { class: 'grow' }, h('div', { class: 'title' }, title), meta ? h('div', { class: 'muted' }, meta) : null),
    onEdit ? btn('Editar', onEdit, 'btn-sm', { 'aria-label': `Editar: ${title}` }) : null,
    onDelete ? btn('Apagar', onDelete, 'btn-sm btn-danger', { 'aria-label': `Apagar: ${title}` }) : null,
  );
}

/** Escala 1–5 usada no check-in rápido dentro de um cartão (não em folha). */
export function scaleGroup(name, label, low, high, value = null) {
  const id = `q-${name}`;
  const scale = h('div', { class: 'scale' });
  for (let n = 1; n <= 5; n++) {
    scale.append(
      h('input', { type: 'radio', name, id: `${id}-${n}`, value: String(n), checked: value === n }),
      h('label', { for: `${id}-${n}` }, String(n)),
    );
  }
  const el = h('fieldset', null, h('legend', null, label), scale, h('div', { class: 'scale-ends' }, h('span', null, low), h('span', null, high)));
  return { el, read: () => { const c = el.querySelector('input:checked'); return c ? Number(c.value) : null; } };
}

export const fmtNum = (n, digits = 1) => (n == null ? '—' : n.toFixed(digits).replace('.', ','));
