// Animación de pulsación compartida por todos los botones redondos y chips: el icono rebota y una onda se expande desde el botón.
// Después de `delay` ms se ejecuta la acción (así la animación se ve antes de que cambie la pantalla).
export function pop(btn, then, delay = 200) {
  btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop');
  if (then) setTimeout(then, delay);
}
