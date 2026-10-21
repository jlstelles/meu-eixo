// Folhas modais (formulários e confirmações) construídas sem <dialog>, para funcionar igual em qualquer navegador.

import { h } from './dom.js';

const FOCUSABLE = 'input, select, textarea, button, [href], [tabindex]:not([tabindex="-1"])';

const openClosers = new Set();

/** Fecha todas as folhas abertas (ex.: ao trocar de tela), resolvendo confirmações pendentes como "não". */
export function closeAllSheets() {
  for (const close of [...openClosers]) close();
}

/** Abre uma folha. `build(close)` devolve o conteúdo. `onClose` roda sempre que ela fecha. Retorna a função de fechar. */
export function openSheet(build, label = 'Janela', onClose = null) {
  const previous = document.activeElement;
  const backdrop = h('div', { class: 'sheet-backdrop' });
  const sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': label });

  function close() {
    if (!backdrop.isConnected) return;
    document.removeEventListener('keydown', onKey);
    openClosers.delete(close);
    backdrop.remove();
    if (!document.querySelector('.sheet-backdrop')) document.body.classList.remove('sheet-open');
    if (previous && typeof previous.focus === 'function' && document.contains(previous)) previous.focus();
    if (onClose) onClose();
  }
  function onKey(ev) {
    if (ev.key === 'Escape') close();
  }

  sheet.append(build(close));
  backdrop.append(sheet);
  backdrop.addEventListener('click', (ev) => {
    if (ev.target === backdrop) close();
  });
  document.addEventListener('keydown', onKey);
  openClosers.add(close);
  document.body.append(backdrop);
  document.body.classList.add('sheet-open');
  const first = sheet.querySelector(FOCUSABLE);
  if (first) first.focus();
  return close;
}

/** Confirmação com botões grandes. Resolve true/false (fechar por fora conta como "não"). */
export function confirmSheet({ title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', danger = false }) {
  return new Promise((resolve) => {
    let result = false;
    openSheet(
      (close) =>
        h(
          'div',
          { class: 'stack' },
          h('h2', null, title),
          message ? h('p', null, message) : null,
          h(
            'div',
            { class: 'stack' },
            h('button', { type: 'button', class: danger ? 'btn-danger btn-lg' : 'btn-primary btn-lg', on: { click: () => { result = true; close(); } } }, confirmLabel),
            h('button', { type: 'button', class: 'btn-lg', on: { click: close } }, cancelLabel),
          ),
        ),
      title,
      () => resolve(result),
    );
  });
}

let fieldSeq = 0;

function buildField(f, value) {
  const id = `f${++fieldSeq}-${f.name}`;
  const hintEl = f.hint ? h('p', { class: 'hint', id: `${id}-hint` }, f.hint) : null;
  const describedBy = f.hint ? { 'aria-describedby': `${id}-hint` } : {};

  if (f.type === 'scale') {
    const group = h('fieldset', null, h('legend', null, f.label));
    const scale = h('div', { class: 'scale' });
    for (let n = 1; n <= 5; n++) {
      scale.append(
        h('input', { type: 'radio', name: f.name, id: `${id}-${n}`, value: String(n), checked: value === n, required: f.required }),
        h('label', { for: `${id}-${n}` }, String(n)),
      );
    }
    group.append(scale, h('div', { class: 'scale-ends' }, h('span', null, f.low ?? ''), h('span', null, f.high ?? '')), hintEl);
    return { el: group, read: () => (group.querySelector('input:checked') ? Number(group.querySelector('input:checked').value) : null) };
  }

  if (f.type === 'checkbox') {
    const input = h('input', { type: 'checkbox', id, name: f.name, checked: Boolean(value) });
    return { el: h('div', { class: 'field' }, h('div', { class: 'check' }, input, h('label', { for: id }, f.label)), hintEl), read: () => input.checked };
  }

  let input;
  if (f.type === 'select') {
    input = h(
      'select',
      { id, name: f.name, required: f.required, ...describedBy },
      f.options.map((o) => h('option', { value: o.value, selected: String(o.value) === String(value) }, o.label)),
    );
  } else if (f.type === 'textarea') {
    input = h('textarea', { id, name: f.name, maxlength: f.maxlength ?? 1000, required: f.required, placeholder: f.placeholder, ...describedBy });
    input.value = value ?? '';
  } else {
    const isNumber = f.type === 'number';
    input = h('input', {
      type: f.type ?? 'text',
      id,
      name: f.name,
      required: f.required,
      placeholder: f.placeholder,
      min: f.min,
      max: f.max,
      step: isNumber ? (f.step ?? 'any') : f.step,
      inputmode: isNumber ? 'decimal' : undefined,
      maxlength: f.maxlength,
      autocomplete: 'off',
      ...describedBy,
    });
    input.value = value ?? '';
  }

  const read = () => {
    const raw = input.value;
    if (f.type === 'number') return raw === '' ? null : Number(raw);
    if (f.type === 'select') return raw;
    return typeof raw === 'string' ? raw.trim() : raw;
  };
  return { el: h('div', { class: 'field' }, h('label', { for: id }, f.label), input, hintEl), read };
}

/**
 * Formulário em folha. fields: [{ name, label, type, required, hint, options, min, max, step, low, high }]
 * onSubmit(values) pode devolver uma string para mostrar como erro e manter a folha aberta.
 */
export function openForm({ title, intro, fields, values = {}, submitLabel = 'Salvar', onSubmit, onDelete, deleteLabel = 'Apagar registro' }) {
  return openSheet((close) => {
    const built = fields.map((f) => ({ f, ...buildField(f, values[f.name]) }));
    const errorEl = h('p', { class: 'form-error', role: 'alert', hidden: true });
    const form = h(
      'form',
      { class: 'stack' },
      h('h2', null, title),
      intro ? h('p', { class: 'muted' }, intro) : null,
      built.map((b) => b.el),
      errorEl,
      h('button', { type: 'submit', class: 'btn-primary btn-lg' }, submitLabel),
      h('button', { type: 'button', class: 'btn-lg', on: { click: close } }, 'Cancelar'),
    );
    if (onDelete) {
      form.append(
        h('button', { type: 'button', class: 'btn-danger', on: { click: async () => { if (await onDelete()) close(); } } }, deleteLabel),
      );
    }
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      errorEl.hidden = true;
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      const out = {};
      for (const b of built) out[b.f.name] = b.read();
      const res = await onSubmit(out);
      if (typeof res === 'string') {
        errorEl.textContent = res;
        errorEl.hidden = false;
        return;
      }
      close();
    });
    return form;
  }, title);
}
