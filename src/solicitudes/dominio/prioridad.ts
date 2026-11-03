export enum Prioridad {
  BAJA = 'BAJA',
  MEDIA = 'MEDIA',
  ALTA = 'ALTA',
}

const ORDEN: readonly Prioridad[] = [Prioridad.BAJA, Prioridad.MEDIA, Prioridad.ALTA];

/** La prioridad siguiente; ALTA ya es el tope. */
export function subirUnNivel(prioridad: Prioridad): Prioridad {
  return ORDEN[Math.min(ORDEN.indexOf(prioridad) + 1, ORDEN.length - 1)];
}
