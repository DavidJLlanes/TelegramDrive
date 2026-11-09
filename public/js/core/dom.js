// Constructor DOM seguro: nunca interpreta HTML en datos del usuario (nombres de archivo, etc.).
const PROPS = new Set(['value', 'checked', 'disabled', 'hidden', 'textContent', 'src', 'min', 'max', 'step']);

export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key.startsWith('on')) el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (PROPS.has(key)) el[key] = value;
    else el.setAttribute(key, value === true ? '' : value);
  }
  append(el, children);
  return el;
}

export function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

export const clear = (el) => { el.replaceChildren(); return el; };
export const $ = (selector, root = document) => root.querySelector(selector);
