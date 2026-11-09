// La app es una interfaz, no un documento: sin zoom con los dedos ni con doble toque (el visor de fotos tiene su propio zoom al tocar).
// El meta viewport y `touch-action` lo cubren en Android y escritorio; Safari de iOS ignora `user-scalable=no`, así que se bloquea su gesto.
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(type, (e) => e.preventDefault());
document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
