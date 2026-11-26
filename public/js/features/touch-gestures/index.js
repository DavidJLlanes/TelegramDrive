// Gestos táctiles: pulsación larga sobre archivos y carpetas = empezar a seleccionar. Solo en archivos: deslizar a la izquierda =
// papelera (con «Deshacer») y a la derecha = compartir (las carpetas no se deslizan). Solo con dedo: con ratón no cambia nada.
import { appState } from '../../core/store.js';
import { fileKey, folderKey, toggleSelected } from '../../ui/selection.js';
import { trashFile } from '../../ui/actions.js';
import { shareItem } from '../../ui/share-dialog.js';

const HOLD_MS = 480;
const MOVE_TOLERANCE = 9;   // px antes de cancelar la pulsación larga
const SWIPE_AT = 96;        // px para disparar el deslizamiento

const target = (e) => e.target.closest('.tile, .sleeve');
const keyOf = (card) => (card.dataset.id ? fileKey({ id: Number(card.dataset.id) }) : folderKey({ path: card.dataset.path }));
const fileOf = (card) => appState.get().files.concat(appState.get().results ?? []).find((f) => String(f.id) === card.dataset.id);

let press = null;
let swallowClick = false;

function reset(card) {
  if (!card) return;
  card.style.removeProperty('transform'); card.style.removeProperty('transition'); card.classList.remove('swipe-left', 'swipe-right');
}

document.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'touch' || e.target.closest('button, input, a')) return;
  const card = target(e);
  if (!card) return;
  press = { card, x: e.clientX, y: e.clientY, id: e.pointerId, held: false, dx: 0, locked: false };
  press.timer = setTimeout(() => {
    if (!press) return;
    press.held = true; swallowClick = true;
    navigator.vibrate?.(14);
    toggleSelected(keyOf(card));
  }, HOLD_MS);
});

document.addEventListener('pointermove', (e) => {
  if (!press || e.pointerId !== press.id) return;
  const dx = e.clientX - press.x; const dy = e.clientY - press.y;
  if (!press.held && Math.hypot(dx, dy) > MOVE_TOLERANCE) clearTimeout(press.timer);
  if (press.held || appState.get().selected.length) return;
  if (press.card.classList.contains('sleeve')) return; // las carpetas no se deslizan: solo pulsación larga para seleccionar
  if (!press.locked && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > MOVE_TOLERANCE) { press = null; return; } // es un desplazamiento vertical
  if (Math.abs(dx) > MOVE_TOLERANCE) {
    press.locked = true; press.dx = dx;
    const { card } = press;
    card.style.setProperty('transform', `translateX(${Math.max(-140, Math.min(140, dx))}px)`);
    card.style.setProperty('transition', 'none');
    card.classList.toggle('swipe-left', dx <= -SWIPE_AT);
    card.classList.toggle('swipe-right', dx >= SWIPE_AT);
  }
});

function finish(e, cancelled) {
  if (!press || e.pointerId !== press.id) return;
  const { card, dx, locked, timer } = press;
  clearTimeout(timer); press = null;
  if (locked) {
    swallowClick = true;
    card.style.setProperty('transition', 'transform 0.2s ease');
    if (!cancelled && dx <= -SWIPE_AT) { const f = fileOf(card); if (f) trashFile(f); }
    else if (!cancelled && dx >= SWIPE_AT) { const f = fileOf(card); if (f) shareItem({ kind: 'file', target: f.id, label: f.name }); }
    setTimeout(() => reset(card), 220);
  }
  if (swallowClick) setTimeout(() => { swallowClick = false; }, 350);
}
document.addEventListener('pointerup', (e) => finish(e, false));
document.addEventListener('pointercancel', (e) => finish(e, true));
document.addEventListener('click', (e) => { if (swallowClick) { e.stopPropagation(); e.preventDefault(); swallowClick = false; } }, true);
document.addEventListener('contextmenu', (e) => { if (press?.held || (e.pointerType === 'touch' && target(e) && press)) e.preventDefault(); });
