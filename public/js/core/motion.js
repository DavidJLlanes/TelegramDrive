// Movimiento: transiciones entre pantallas (View Transitions con dirección y «héroe»), morfosis de imágenes y salidas animadas.
import { appState, watch } from './store.js';
import { screenKey, screenBusy, screenDirection, heroFolder } from './screen-key.js';

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const canMorph = () => typeof document.startViewTransition === 'function' && !reduced();
const HOLD = 450; // ms máximos que se espera a los datos antes de mostrar la pantalla nueva (evita el destello del esqueleto)
const root = document.documentElement;
let batch = null;
let running = false; // una transición en curso: los cambios siguientes se pintan dentro de ella, sin abrir otra

const quiet = (t) => { t.ready.catch(() => {}); t.updateCallbackDone.catch(() => {}); return t.finished.catch(() => {}); };
const name = (el, n) => { if (el) el.style.viewTransitionName = n; };
const inView = (el) => { const r = el?.getBoundingClientRect(); return r && r.bottom > 0 && r.top < innerHeight && r.width > 0; };
const sleeveName = (path) => document.querySelector(`.sleeve[data-path="${CSS.escape(path)}"] .sleeve-name`);
const title = () => document.querySelector('.page-title h1');

/** Resuelve cuando la pantalla deja de cargar o pasado `ms`. */
function settle(ms) {
  return new Promise((resolve) => {
    if (!screenBusy(appState.get())) { resolve(); return; }
    let off = () => {};
    const done = () => { off(); clearTimeout(timer); resolve(); };
    const timer = setTimeout(done, ms);
    off = appState.subscribe((s) => { if (!screenBusy(s)) done(); });
  });
}

function replay(el, cls) { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

function screenSwap(fn, from, to) {
  if (!canMorph()) { fn(); if (!reduced()) replay(document.querySelector('.content'), 'enter'); return; }
  if (batch) { batch.push(fn); return; }
  if (running) { fn(); return; }
  batch = [fn];
  running = true;
  const dir = screenDirection(from, to);
  const hero = heroFolder(from, to, dir);
  let target = null;
  const source = hero ? (dir === 'forward' ? sleeveName(hero) : title()) : null;
  name(source, 'hero');
  root.dataset.nav = dir;
  const t = document.startViewTransition(async () => {
    const fns = batch; batch = null;
    name(source, '');
    fns.forEach((f) => f());
    await settle(HOLD);
    if (hero) { target = dir === 'forward' ? title() : sleeveName(hero); if (inView(target)) name(target, 'hero'); else target = null; }
  });
  quiet(t).then(() => { running = false; name(target, ''); delete root.dataset.nav; });
}

/** ¿Hay una transición de pantalla o morfosis en curso? */
export const transitioning = () => running;

/** Como watch(), pero los cambios de pantalla se pintan dentro de una transición compartida. */
export function watchScreen(el, paint) {
  let prev = appState.get();
  let last = screenKey(prev);
  let pending = false; // repintado ya encargado a la transición: no adelantarlo (se colaría en la captura «antes»)
  watch(appState, el, (s) => {
    const was = prev; prev = s;
    const key = screenKey(s);
    if (key === last) { if (!pending) paint(s); return; }
    last = key;
    pending = true;
    screenSwap(() => { pending = false; paint(appState.get()); }, was, s);
  });
  paint(prev);
}

/** Morfosis de un elemento a otro (miniatura ↔ visor). `update(morphing)` cambia el DOM (puede ser async); `target` da el elemento final.
 *  Devuelve una promesa que se cumple al acabar, o null si no hubo morfosis. */
export function morph(source, update, target) {
  if (!canMorph() || running || !inView(source)) { update(false); return null; }
  running = true;
  name(source, 'media');
  root.dataset.nav = 'morph';
  let end = null;
  const t = document.startViewTransition(async () => {
    name(source, '');
    await update(true);
    end = target();
    if (end && (end === source || !inView(end))) end = null;
    name(end, 'media');
  });
  return quiet(t).then(() => { running = false; name(end, ''); delete root.dataset.nav; });
}

/** Quita `el` tras su animación de salida (clase .leaving); espera a la más larga entre él y su primer hijo. */
export function leave(el) {
  if (!el?.isConnected) return;
  if (reduced()) { el.remove(); return; }
  el.classList.add('leaving');
  const secs = (node) => (node ? Math.max(0, ...getComputedStyle(node).animationDuration.split(',').map(parseFloat)) : 0);
  const ms = Math.max(secs(el), secs(el.firstElementChild)) * 1000;
  setTimeout(() => el.remove(), Math.min(ms || 0, 600) + 20);
}

/** Indicador que se desliza entre pestañas: un único elemento con nombre de transición dentro de la activa. */
export function indicator(container, selector, cls) {
  container.querySelector(`.${cls}`)?.remove();
  container.querySelector(selector)?.append(Object.assign(document.createElement('span'), { className: cls, ariaHidden: 'true' }));
}
