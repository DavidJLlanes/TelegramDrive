// Silueta de la carpeta (cuerpo + pestaña) como un único trazado SVG, para recortar la imagen y dibujar el borde con exactitud
// a cualquier tamaño: la pestaña y el cuerpo comparten un solo contorno, sin costuras. `inset` mete el trazo hacia dentro (mitad de su grosor).
export const TAB_W = 62; // ancho de la pestaña
export const TAB_H = 9;  // lo que sobresale la pestaña por encima del cuerpo
const R_BODY = 16;       // esquinas del cuerpo
const R_TAB = 6;         // esquina superior de la pestaña (TAB_H = R_TAB + R_JOIN: la pestaña se enlaza con el cuerpo sin tramo recto)
const R_JOIN = 3;        // unión cóncava pestaña → cuerpo

export function folderPath(w, h, inset = 0) {
  const i = inset;
  const rb = R_BODY - i; const rt = R_TAB - i; const rj = R_JOIN + i;
  const x1 = w - i; const y1 = h - i; const tabR = TAB_W - i;
  const top = TAB_H + i; // arista superior del cuerpo
  return [
    `M ${i} ${i + rt}`,
    `A ${rt} ${rt} 0 0 1 ${i + rt} ${i}`,            // arriba a la izquierda (pestaña)
    `L ${tabR - rt} ${i}`,
    `A ${rt} ${rt} 0 0 1 ${tabR} ${i + rt}`,         // arriba a la derecha (pestaña)
    `L ${tabR} ${top - rj}`,
    `A ${rj} ${rj} 0 0 0 ${tabR + rj} ${top}`,       // unión cóncava
    `L ${x1 - rb} ${top}`,
    `A ${rb} ${rb} 0 0 1 ${x1} ${top + rb}`,         // arriba a la derecha (cuerpo)
    `L ${x1} ${y1 - rb}`,
    `A ${rb} ${rb} 0 0 1 ${x1 - rb} ${y1}`,          // abajo a la derecha
    `L ${i + rb} ${y1}`,
    `A ${rb} ${rb} 0 0 1 ${i} ${y1 - rb}`,           // abajo a la izquierda
    'Z',
  ].join(' ');
}
