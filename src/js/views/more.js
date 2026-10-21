// Menu "Mais": atalhos para as demais áreas.

import { h } from '../ui/dom.js';

const LINKS = [
  { href: '/sono', title: 'Sono', text: 'Horários, duração aproximada e qualidade percebida' },
  { href: '/pausas', title: 'Pausas e lembretes', text: 'Pausas no trabalho, água e rotina noturna' },
  { href: '/mobilidade', title: 'Mobilidade e mindfulness', text: 'Cartões rápidos de 1 a 3 minutos' },
  { href: '/saude', title: 'Pressão e batimentos', text: 'Registros opcionais, sem interpretação' },
  { href: '/musica', title: 'Música e foco', text: 'Links das suas playlists' },
  { href: '/ajustes', title: 'Ajustes e backup', text: 'Metas, exportar e importar seus dados' },
];

export function renderMore() {
  return [
    h(
      'section',
      { class: 'card' },
      h(
        'div',
        { class: 'list' },
        LINKS.map((l) =>
          h('a', { class: 'item link-row', href: `#${l.href}` }, h('div', { class: 'grow' }, h('div', { class: 'title' }, l.title), h('div', { class: 'muted' }, l.text)), h('span', { 'aria-hidden': 'true' }, '›')),
        ),
      ),
    ),
    h('p', { class: 'footer-note' }, 'Ferramenta de organização pessoal; não substitui profissional de saúde. Seus dados ficam só neste aparelho.'),
  ];
}
