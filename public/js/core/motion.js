// Movimiento: cambios de pantalla con salida + entrada coreografiadas (Web Animations, sin capturas de pantalla),
// indicadores que se deslizan (FLIP), morfosis miniatura ↔ visor (View Transitions) y salidas animadas de capas.
import { appState, watch } from './store.js';
import { screenKey, screenBusy, screenDirection } from './screen-key.js';

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;
const OUT = 'cubic-bezier(0.4, 0, 1, 1)';
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'; // desaceleración larga, sin rebote: la sensación de iOS
const SPRING = 'linear(0, 0.083, 0.255, 0.442, 0.609, 0.742, 0.84, 0.908, 0.952, 0.98, 0.995, 1.003, 1.006, 1.006, 1.005, 1.003, 1.001, 1)';
const EXIT_MS = 110;
const WAIT_MS = 260; // margen para que lleguen los datos antes de pintar (evita el destello del esqueleto)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const scrolls = new Map(); // posición de desplazamiento por pantalla, para volver donde estabas

let batch = null;   // repintados pendientes de la transición en curso
let running = false;

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

const stage = () => [document.querySelector('.page-head'), document.querySelector('.content')].filter(Boolean);
const shift = (dir, px) => (dir === 'forward' ? px : dir === 'back' ? -px : 0);

async function screenSwap(fn, from, to) {
  if (batch) { batch.push(fn); return; }
  if (running || reduced()) { fn(); return; }
  batch = [fn];
  running = true;
  const dir = screenDirection(from, to);
  scrolls.set(screenKey(from), scrollY);
  const els = stage();
  // 1) Salida breve: lo anterior se aparta y se desvanece (respuesta inmediata al toque)…
  const exits = els.map((el) => el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translate(${shift(dir, -14)}px, ${dir === 'fade' ? -4 : 0}px)` }],
    { duration: EXIT_MS, easing: OUT, fill: 'forwards' }));
  // 2) …mientras, se dan unos instantes a los datos para no enseñar el esqueleto…
  await Promise.all([sleep(EXIT_MS), settle(WAIT_MS)]);
  const fns = batch; batch = null;
  fns.forEach((f) => f());
  scrollTo({ top: dir === 'back' ? scrolls.get(screenKey(to)) ?? 0 : 0, behavior: 'instant' });
  exits.forEach((a) => a.cancel());
  // 3) Entrada: la cabecera primero y el contenido un poco después, deslizándose desde el lado al que se avanza.
  const enters = stage().map((el, i) => el.animate(
    [{ opacity: 0, transform: `translate(${shift(dir, 26)}px, ${dir === 'fade' ? 10 : 0}px)` }, { opacity: 1, transform: 'none' }],
    { duration: 460, delay: i * 45, easing: EASE, fill: 'backwards' }));
  await Promise.all(enters.map((a) => a.finished.catch(() => {})));
  running = false;
}

/** ¿Hay una transición de pantalla o morfosis en curso? */
export const transitioning = () => running;

/** Como watch(), pero los cambios de pantalla se pintan con la coreografía de salida y entrada. */
export function watchScreen(el, paint) {
  let prev = appState.get();
  let last = screenKey(prev);
  let pending = false; // repintado ya encargado a la transición: no adelantarlo
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

/** Rectángulo actual del indicador (medirlo ANTES de repintar el contenedor). */
export const indicatorRect = (container, cls) => container.querySelector(`.${cls}`)?.getBoundingClientRect() ?? null;

/** Indicador que se desliza entre pestañas: el nuevo parte de la posición y tamaño `from` del anterior (FLIP). */
export function indicator(container, selector, cls, from = indicatorRect(container, cls)) {
  container.querySelector(`.${cls}`)?.remove();
  const host = container.querySelector(selector);
  if (!host) return;
  const el = Object.assign(document.createElement('span'), { className: cls });
  el.setAttribute('aria-hidden', 'true');
  host.append(el);
  if (!from || reduced() || !from.width) return;
  const to = el.getBoundingClientRect();
  if (!to.width || (from.left === to.left && from.top === to.top)) return;
  const t = `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`;
  try { el.animate([{ transform: t }, { transform: 'none' }], { duration: 480, easing: SPRING }); }
  catch { el.animate([{ transform: t }, { transform: 'none' }], { duration: 420, easing: EASE }); }
}

const name = (el, n) => { if (el) el.style.viewTransitionName = n; };
const inView = (el) => { const r = el?.getBoundingClientRect(); return r && r.bottom > 0 && r.top < innerHeight && r.width > 0; };

/** Morfosis de un elemento a otro (miniatura ↔ visor). `update(morphing)` cambia el DOM (puede ser async); `target` da el elemento final.
 *  Devuelve una promesa que se cumple al acabar, o null si no hubo morfosis. */
export function morph(source, update, target) {
  if (typeof document.startViewTransition !== 'function' || reduced() || running || !inView(source)) { update(false); return null; }
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
  t.ready.catch(() => {}); t.updateCallbackDone.catch(() => {});
  return t.finished.catch(() => {}).then(() => { running = false; name(end, ''); delete root.dataset.nav; });
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
