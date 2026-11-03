export enum Estado {
  PENDIENTE = 'PENDIENTE',
  EN_REVISION = 'EN_REVISION',
  RESUELTA = 'RESUELTA',
  RECHAZADA = 'RECHAZADA',
}

/**
 * A qué estados se puede pasar desde cada uno. Reemplaza los `if` anidados:
 * agregar una transición es agregar un valor a esta tabla.
 */
export const TRANSICIONES: Readonly<Record<Estado, readonly Estado[]>> = {
  [Estado.PENDIENTE]: [Estado.EN_REVISION, Estado.RECHAZADA],
  [Estado.EN_REVISION]: [Estado.RESUELTA, Estado.RECHAZADA],
  [Estado.RESUELTA]: [],
  [Estado.RECHAZADA]: [],
};

export const esCerrado = (estado: Estado): boolean => TRANSICIONES[estado].length === 0;
