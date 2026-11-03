// Valores de negocio que antes aparecían como números sueltos en el código.

export const MAXIMO_ABIERTAS_POR_RESPONSABLE = 5;
export const LARGO_MINIMO_DE_TEXTO = 10;
export const CANAL_POR_DEFECTO = 'WEB';
export const MILISEGUNDOS_POR_DIA = 24 * 60 * 60 * 1000;

export enum Condicion {
  REGULAR = 'REGULAR',
  LIBRE = 'LIBRE',
}

export const tieneLargoMinimo = (texto: string | undefined): boolean =>
  !!texto && texto.trim().length >= LARGO_MINIMO_DE_TEXTO;
