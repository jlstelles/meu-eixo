import { h } from './dom.js';

/** Aviso curto na parte de baixo. `action` permite "Desfazer". */
export function toast(message, { action = null, ms = 4000 } = {}) {
  const host = document.getElementById('toasts');
  if (!host) return;
  const el = h('div', { class: 'toast' }, h('span', null, message));
  const remove = () => el.remove();
  if (action) {
    el.append(
      h('button', { type: 'button', on: { click: () => { action.onClick(); remove(); } } }, action.label),
    );
  }
  host.append(el);
  setTimeout(remove, ms);
}
