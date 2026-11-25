// Silueta de la carpeta (cuerpo + pestaña) como un único trazado SVG, a cualquier tamaño: pestaña y cuerpo comparten un solo contorno, sin
// costuras. `inset` mete el trazado hacia dentro (para que el trazo del borde quede entero dentro de la tarjeta).
export const TAB_W = 62;  // ancho de la pestaña
export const TAB_H = 9;   // lo que sobresale la pestaña por encima del cuerpo
const R_BODY = 16;        // esquinas del cuerpo (también la de arriba a la izquierda, que es la de la pestaña)
const R_TAB = 6;          // esquina superior derecha de la pestaña (TAB_H = R_TAB + R_JOIN: se enlaza con el cuerpo sin tramo recto)
const R_JOIN = 3;         // unión cóncava pestaña → cuerpo

const n = (v) => Math.round(v * 100) / 100;

export function folderPath(w, h, inset = 0) {
  const i = inset;
  const rb = R_BODY - i; const rt = R_TAB - i; const rj = R_JOIN + i;
  const x1 = w - i; const y1 = h - i; const tabR = TAB_W - i;
  const top = TAB_H + i; // arista superior del cuerpo
  return [
    `M ${n(i)} ${n(i + rb)}`,
    `A ${n(rb)} ${n(rb)} 0 0 1 ${n(i + rb)} ${n(i)}`,          // arriba a la izquierda (misma curva que el resto de esquinas)
    `L ${n(tabR - rt)} ${n(i)}`,
    `A ${n(rt)} ${n(rt)} 0 0 1 ${n(tabR)} ${n(i + rt)}`,       // arriba a la derecha de la pestaña
    `L ${n(tabR)} ${n(top - rj)}`,
    `A ${n(rj)} ${n(rj)} 0 0 0 ${n(tabR + rj)} ${n(top)}`,     // unión cóncava
    `L ${n(x1 - rb)} ${n(top)}`,
    `A ${n(rb)} ${n(rb)} 0 0 1 ${n(x1)} ${n(top + rb)}`,       // arriba a la derecha del cuerpo
    `L ${n(x1)} ${n(y1 - rb)}`,
    `A ${n(rb)} ${n(rb)} 0 0 1 ${n(x1 - rb)} ${n(y1)}`,        // abajo a la derecha
    `L ${n(i + rb)} ${n(y1)}`,
    `A ${n(rb)} ${n(rb)} 0 0 1 ${n(i)} ${n(y1 - rb)}`,         // abajo a la izquierda
    'Z',
  ].join(' ');
}
