// Música e foco: links de playlists por tipo de atividade, abertos em serviço externo. Sem player próprio.

import { PLAYLIST_KINDS, uid } from '../core/defaults.js';
import { safeUrl } from '../core/validate.js';
import { h } from '../ui/dom.js';
import { openForm } from '../ui/sheet.js';
import { btn, card, emptyState, primaryBtn } from '../ui/widgets.js';
import { removeListItem } from './actions.js';

const kindOptions = Object.entries(PLAYLIST_KINDS).map(([value, label]) => ({ value, label }));

function openPlaylist(app, item = null) {
  openForm({
    title: item ? 'Editar playlist' : 'Nova playlist',
    fields: [
      { name: 'label', type: 'text', label: 'Nome', required: true, maxlength: 80, placeholder: 'Ex.: Foco profundo' },
      { name: 'url', type: 'url', label: 'Link da playlist', required: true, placeholder: 'https://…', hint: 'Cole o link de compartilhamento do seu serviço de música. O app só abre o link; não toca música sozinho.' },
      { name: 'kind', type: 'select', label: 'Usar em', required: true, options: kindOptions },
    ],
    values: item ?? { kind: 'focus' },
    onSubmit: (v) => {
      const url = safeUrl(v.url);
      if (!v.label) return 'Informe um nome.';
      if (!url) return 'Use um link completo que comece com http:// ou https://.';
      const data = { label: v.label, url, kind: v.kind in PLAYLIST_KINDS ? v.kind : 'focus' };
      app.store.update((s) => {
        if (item) Object.assign(s.playlists.find((p) => p.id === item.id) ?? {}, data);
        else s.playlists.push({ id: uid(), ...data });
      });
    },
  });
}

export function renderMusic(app) {
  const { playlists } = app.store.get();
  const groups = Object.entries(PLAYLIST_KINDS)
    .map(([kind, label]) => ({ kind, label, items: playlists.filter((p) => p.kind === kind) }))
    .filter((g) => g.items.length);

  return [
    card('Playlists', h('p', { class: 'muted' }, 'Salve links por tipo de atividade e abra com um toque no seu serviço de música.'), primaryBtn('Adicionar playlist', () => openPlaylist(app), 'btn-lg btn-block')),
    ...(groups.length
      ? groups.map((g) =>
          card(
            g.label,
            h(
              'div',
              { class: 'list' },
              g.items.map((p) =>
                h(
                  'div',
                  { class: 'meal' },
                  h('div', { class: 'title' }, p.label),
                  h('a', { class: 'btn btn-primary', href: p.url, target: '_blank', rel: 'noopener noreferrer' }, 'Abrir'),
                  h('div', { class: 'grid2' }, btn('Editar', () => openPlaylist(app, p), 'btn-sm', { 'aria-label': `Editar ${p.label}` }), btn('Apagar', () => removeListItem(app, 'playlists', p.id, 'Playlist'), 'btn-sm btn-danger', { 'aria-label': `Apagar ${p.label}` })),
                ),
              ),
            ),
          ),
        )
      : [card(null, emptyState('Nenhuma playlist salva ainda.'))]),
  ];
}
