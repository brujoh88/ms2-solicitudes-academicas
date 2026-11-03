import { Prioridad } from './prioridad';

export enum Area {
  BEDELIA = 'BEDELIA',
  DEPARTAMENTO_ACADEMICO = 'DEPARTAMENTO_ACADEMICO',
}

/**
 * Todo lo que el sistema necesita saber de un tipo de solicitud. Antes estaba
 * repartido en tres `switch` y una validación; ahora cada tipo lo dice en un
 * solo lugar y los que lo usan no preguntan "¿qué tipo sos?".
 */
export interface TipoSolicitud {
  readonly codigo: string;
  readonly prioridadBase: Prioridad;
  readonly plazoEnDias: number;
  readonly area: Area;
  /** Si un estudiante libre (no regular) puede iniciarlo. */
  readonly admiteEstudiantesLibres: boolean;
}

/** Para agregar un tipo nuevo alcanza con agregar una entrada (OCP). */
export const TIPOS_DE_SOLICITUD: readonly TipoSolicitud[] = [
  {
    codigo: 'CERTIFICADO',
    prioridadBase: Prioridad.BAJA,
    plazoEnDias: 2,
    area: Area.BEDELIA,
    admiteEstudiantesLibres: false,
  },
  {
    codigo: 'EQUIVALENCIA',
    prioridadBase: Prioridad.MEDIA,
    plazoEnDias: 20,
    area: Area.DEPARTAMENTO_ACADEMICO,
    admiteEstudiantesLibres: false,
  },
  {
    codigo: 'CAMBIO_COMISION',
    prioridadBase: Prioridad.ALTA,
    plazoEnDias: 3,
    area: Area.BEDELIA,
    admiteEstudiantesLibres: false,
  },
  {
    codigo: 'RECLAMO_NOTA',
    prioridadBase: Prioridad.ALTA,
    plazoEnDias: 5,
    area: Area.DEPARTAMENTO_ACADEMICO,
    admiteEstudiantesLibres: true,
  },
];

export function buscarTipo(codigo: string): TipoSolicitud | undefined {
  return TIPOS_DE_SOLICITUD.find((tipo) => tipo.codigo === codigo);
}
