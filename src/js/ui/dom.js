// Construtor de elementos. Texto sempre entra como nó de texto (nunca innerHTML), então dados do usuário não executam nada.

const PROPS = new Set(['value', 'checked', 'disabled', 'hidden', 'selected', 'required', 'readOnly', 'multiple']);

export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'on') for (const [ev, fn] of Object.entries(v)) el.addEventListener(ev, fn);
      else if (PROPS.has(k)) el[k] = v;
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  append(el, children);
  return el;
}

export function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const ICONS = {
  home: '<path d="M3 12l9-9 9 9"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  water: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  food: '<path d="M7 3v8a2 2 0 0 0 2 2v8"/><path d="M11 3v8"/><path d="M7 7h4"/><path d="M17 3c-2 2-3 5-3 8h3v10"/>',
  move: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
};

/** Ícone SVG decorativo a partir de um conjunto fixo e confiável. */
export function icon(name) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = ICONS[name] ?? '';
  return svg;
}
